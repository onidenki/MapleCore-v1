// src/app/api/vote/webhook/route.ts
// Enhanced webhook with IP tracking, failed vote handling, and comprehensive security
import { NextRequest, NextResponse } from 'next/server';
import pool, { transaction, query, queryOne } from '@/lib/db';
import crypto from 'crypto';

// Your Gtop100 pingback key (set this in your .env file)
const GTOP100_PINGBACK_KEY = process.env.GTOP100_PINGBACK_KEY;

// Vote site configurations with cooldowns
const VOTE_SITES = {
  'gtop100': {
    name: 'Gtop100',
    nx_reward: 8000,
    cooldown_hours: 24,  // GTop100 official rule: 24 hours per IP
    ip_cooldown_hours: 24  // IP-based cooldown
  }
  // Add more sites here as needed
};

// Get client IP from various headers
function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const real = request.headers.get('x-real-ip');
  const cloudflare = request.headers.get('cf-connecting-ip');
  
  // Log all IP headers in production for debugging
  if (process.env.NODE_ENV === 'production') {
    console.log('IP Headers:', {
      'x-forwarded-for': forwarded,
      'x-real-ip': real,
      'cf-connecting-ip': cloudflare
    });
  }
  
  if (cloudflare) return cloudflare;
  if (forwarded) return forwarded.split(',')[0].trim();
  if (real) return real;
  
  return 'unknown';
}

// Generate a hash of the IP for privacy
function hashIp(ip: string): string {
  return crypto.createHash('sha256').update(ip + process.env.JWT_SECRET).digest('hex');
}

export async function POST(request: NextRequest) {
  console.log('🔔 WEBHOOK CALLED!');
  console.log('Environment:', process.env.NODE_ENV);
  console.log('Headers:', Object.fromEntries(request.headers.entries()));
  
  const clientIp = getClientIp(request);
  const hashedIp = hashIp(clientIp);
  console.log('Client IP:', clientIp);
  console.log('Client IP (hashed):', hashedIp.substring(0, 16) + '...');
  
  try {
    const contentType = request.headers.get('content-type') || '';
    console.log('Content-Type:', contentType);

    let pingbackData: any[] = [];

    if (contentType.includes('application/json')) {
      // Handle JSON format (recommended by Gtop100)
      const jsonData = await request.json();
      console.log('JSON data:', jsonData);
      
      if (!jsonData || !jsonData.Common) {
        console.log('Invalid JSON structure');
        return new Response('Invalid JSON data.', { status: 400 });
      }

      const pingbackkey = jsonData.pingbackkey;
      console.log('Received pingback key:', pingbackkey);
      console.log('Expected pingback key:', GTOP100_PINGBACK_KEY);

      // Verify pingback key
      if (pingbackkey !== GTOP100_PINGBACK_KEY) {
        console.log('Invalid pingback key - mismatch');
        return new Response('Invalid pingback key.', { status: 403 });
      }

      // Process each vote in the Common array
      for (const entry of jsonData.Common) {
        const mappedData: any = {};
        for (const subEntry of entry) {
          Object.assign(mappedData, subEntry);
        }

        pingbackData.push({
          success: Math.abs(parseInt(mappedData.success || '1')),
          reason: mappedData.reason,
          username: mappedData.pb_name,
          site: 'gtop100'
        });
      }

    } else {
      // Handle POST form data format
      const formData = await request.formData();
      console.log('Form data received');
      
      const success = Math.abs(parseInt(formData.get('Successful')?.toString() || '1'));
      const reason = formData.get('Reason')?.toString();
      const username = formData.get('pingUsername')?.toString();
      const pingbackkey = formData.get('pingbackkey')?.toString();

      console.log('Parsed form data:', { success, reason, username, pingbackkey: pingbackkey ? 'present' : 'missing' });

      // Verify pingback key
      if (pingbackkey !== GTOP100_PINGBACK_KEY) {
        console.log('Invalid pingback key in form data');
        return new Response('Invalid pingback key.', { status: 403 });
      }

      pingbackData.push({
        success,
        reason,
        username,
        site: 'gtop100'
      });
    }

    const processedVotes: string[] = [];
    const failedVotes: string[] = [];

    // Process each vote
    for (const vote of pingbackData) {
      const { success, reason, username, site } = vote;

      console.log(`Processing vote: username=${username}, success=${success}, reason=${reason}, site=${site}`);

      if (!username) {
        console.log('Vote received without username');
        continue;
      }

      // Get site configuration
      const siteConfig = VOTE_SITES[site as keyof typeof VOTE_SITES];
      if (!siteConfig) {
        console.log(`Unknown vote site: ${site}`);
        continue;
      }

      // Check if vote was successful (success = 0 means successful in Gtop100)
      if (success !== 0) {
        console.log(`Failed vote for ${username}: ${reason}`);
        
        // Log the failed vote
        await query(
          `INSERT INTO vote_logs (username, site, vote_time, nx_awarded, ip_address, ip_hash, status, failure_reason) 
           VALUES (?, ?, NOW(), 0, ?, ?, 'failed', ?)`,
          [username, site, clientIp, hashedIp, reason || 'Unknown reason']
        );
        
        failedVotes.push(`${username}: Failed - ${reason}`);
        continue;
      }

      // Check if user exists - Getting nxCredit and votepoints
      const account = await queryOne<any>(
        'SELECT id, name, nxCredit, votepoints FROM accounts WHERE name = ?',
        [username]
      );

      if (!account) {
        console.log(`Vote received for non-existent user: ${username}`);
        
        // Log the invalid attempt
        await query(
          `INSERT INTO vote_logs (username, site, vote_time, nx_awarded, ip_address, ip_hash, status, failure_reason) 
           VALUES (?, ?, NOW(), 0, ?, ?, 'failed', 'User not found')`,
          [username, site, clientIp, hashedIp]
        );
        
        continue;
      }

      console.log(`Found account: ${account.name}, nxCredit: ${account.nxCredit} (will be updated)`);

      // Process vote in transaction
      try {
        await transaction(async (connection) => {
          // Check IP-based cooldown
          const ipCooldownHours = siteConfig.ip_cooldown_hours;
          const [ipCooldownRows] = await connection.execute(
            `SELECT last_vote_time, vote_count FROM vote_ip_cooldowns 
             WHERE ip_hash = ? AND site = ? 
             AND last_vote_time > DATE_SUB(NOW(), INTERVAL ? HOUR)
             FOR UPDATE`,
            [hashedIp, site, ipCooldownHours]
          );

          if (Array.isArray(ipCooldownRows) && ipCooldownRows.length > 0) {
            const ipRecord = ipCooldownRows[0] as any;
            const lastVoteTime = new Date(ipRecord.last_vote_time);
            const nextVoteTime = new Date(lastVoteTime.getTime() + (ipCooldownHours * 60 * 60 * 1000));
            const remainingMinutes = Math.ceil((nextVoteTime.getTime() - Date.now()) / (1000 * 60));

            console.log(`🚫 IP ${hashedIp.substring(0, 16)}... is on cooldown for ${site}. Remaining: ${remainingMinutes} minutes`);
            
            // Log the cooldown attempt
            await connection.execute(
              `INSERT INTO vote_logs (username, site, vote_time, nx_awarded, ip_address, ip_hash, status, failure_reason) 
               VALUES (?, ?, NOW(), 0, ?, ?, 'cooldown', ?)`,
              [username, site, clientIp, hashedIp, `IP cooldown: ${Math.floor(remainingMinutes/60)}h ${remainingMinutes%60}m remaining`]
            );

            failedVotes.push(`${username}: IP cooldown active`);
            return; // Exit transaction
          }

          // Check username-based cooldown
          const userCooldownHours = siteConfig.cooldown_hours;
          const [userCooldownRows] = await connection.execute(
            `SELECT vote_time FROM vote_logs 
             WHERE username = ? AND site = ? 
             AND status = 'success'
             AND vote_time > DATE_SUB(NOW(), INTERVAL ? HOUR)
             ORDER BY vote_time DESC 
             LIMIT 1`,
            [username, site, userCooldownHours]
          );

          if (Array.isArray(userCooldownRows) && userCooldownRows.length > 0) {
            const lastVote = userCooldownRows[0] as any;
            const lastVoteTime = new Date(lastVote.vote_time);
            const nextVoteTime = new Date(lastVoteTime.getTime() + (userCooldownHours * 60 * 60 * 1000));
            const remainingMinutes = Math.ceil((nextVoteTime.getTime() - Date.now()) / (1000 * 60));

            console.log(`🚫 User ${username} is on cooldown for ${site}. Remaining: ${remainingMinutes} minutes`);
            
            // Log the cooldown attempt
            await connection.execute(
              `INSERT INTO vote_logs (username, site, vote_time, nx_awarded, ip_address, ip_hash, status, failure_reason) 
               VALUES (?, ?, NOW(), 0, ?, ?, 'cooldown', ?)`,
              [username, site, clientIp, hashedIp, `User cooldown: ${Math.floor(remainingMinutes/60)}h ${remainingMinutes%60}m remaining`]
            );

            failedVotes.push(`${username}: User cooldown active`);
            return; // Exit transaction
          }

          // Check for duplicate vote attempts
          const [duplicateRows] = await connection.execute(
            `SELECT id FROM vote_logs 
             WHERE username = ? AND site = ? AND ip_hash = ?
             AND vote_time > DATE_SUB(NOW(), INTERVAL 5 MINUTE)
             AND status IN ('success', 'duplicate')
             LIMIT 1`,
            [username, site, hashedIp]
          );

          if (Array.isArray(duplicateRows) && duplicateRows.length > 0) {
            console.log(`🚫 Duplicate vote attempt detected for ${username} from same IP`);
            
            await connection.execute(
              `INSERT INTO vote_logs (username, site, vote_time, nx_awarded, ip_address, ip_hash, status, failure_reason) 
               VALUES (?, ?, NOW(), 0, ?, ?, 'duplicate', 'Duplicate vote attempt')`,
              [username, site, clientIp, hashedIp]
            );

            failedVotes.push(`${username}: Duplicate attempt`);
            return; // Exit transaction
          }

          // All checks passed - process the vote
          // Get current nxCredit and add the reward
          const currentNX = parseInt(account.nxCredit?.toString() || '0');
          const currentVotePoints = parseInt(account.votepoints?.toString() || '0');
          const nxReward = siteConfig.nx_reward;
          const newNXAmount = currentNX + nxReward;
          const newVotePoints = currentVotePoints + 1;

          console.log(`User ${username} - Current NX (nxCredit): ${currentNX}, Adding: ${nxReward}, New Total: ${newNXAmount}`);

          // Update NX and vote points - updating nxCredit
          const [updateResult] = await connection.execute(
            'UPDATE accounts SET nxCredit = ?, votepoints = ? WHERE name = ?',
            [newNXAmount, newVotePoints, username]
          );

          if ((updateResult as any).affectedRows > 0) {
            // Log the successful vote
            await connection.execute(
              `INSERT INTO vote_logs (username, site, vote_time, nx_awarded, ip_address, ip_hash, status) 
               VALUES (?, ?, NOW(), ?, ?, ?, 'success')`,
              [username, site, nxReward, clientIp, hashedIp]
            );

            // Update or insert IP cooldown record
            await connection.execute(
              `INSERT INTO vote_ip_cooldowns (ip_hash, site, last_vote_time, vote_count)
               VALUES (?, ?, NOW(), 1)
               ON DUPLICATE KEY UPDATE 
                 last_vote_time = NOW(),
                 vote_count = vote_count + 1`,
              [hashedIp, site]
            );

            console.log(`✅ Vote processed successfully: ${username} received ${nxReward} NX (${currentNX} -> ${newNXAmount})`);
            processedVotes.push(`${username}: +${nxReward} NX (Total: ${newNXAmount})`);
          } else {
            console.log(`❌ Failed to update database for ${username}`);
            failedVotes.push(`${username}: Database update failed`);
          }
        });
      } catch (error) {
        console.error(`❌ Transaction error for ${username}:`, error);
        failedVotes.push(`${username}: Transaction error`);
      }
    }

    // Build response message
    const responseLines = [];
    if (processedVotes.length > 0) {
      responseLines.push(`✅ Successful: ${processedVotes.length} votes processed`);
      responseLines.push(...processedVotes);
    }
    if (failedVotes.length > 0) {
      responseLines.push(`⚠️ Failed/Blocked: ${failedVotes.length} votes`);
      responseLines.push(...failedVotes);
    }
    if (responseLines.length === 0) {
      responseLines.push('⚠️ No votes processed');
    }

    const responseMessage = responseLines.join('\n');
    console.log(responseMessage);
    
    return new Response(responseMessage, { status: 200 });

  } catch (error) {
    console.error('❌ Vote webhook error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}

// Handle GET requests for webhook verification
export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  console.log('GET request from IP:', ip);
  return new Response('Gtop100 webhook endpoint active', { status: 200 });
}