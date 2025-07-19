// src/app/api/vote/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthenticatedRequest } from '@/lib/middleware/auth';
import { query, queryOne } from '@/lib/db';
import crypto from 'crypto';

// Get client IP from various headers
function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const real = request.headers.get('x-real-ip');
  const cloudflare = request.headers.get('cf-connecting-ip');
  
  if (cloudflare) return cloudflare;
  if (forwarded) return forwarded.split(',')[0].trim();
  if (real) return real;
  
  return 'unknown';
}

// Generate a hash of the IP for privacy
function hashIp(ip: string): string {
  return crypto.createHash('sha256').update(ip + process.env.JWT_SECRET).digest('hex');
}

export const GET = requireAuth(async (req: AuthenticatedRequest) => {
  try {
    const userId = req.user!.userId;
    const username = req.user!.username;
    
    // Get client IP for cooldown checking
    const clientIp = getClientIp(req);
    const hashedIp = hashIp(clientIp);

    // Get user info - getting nxCredit which is what we update
    const user = await queryOne<any>(
      'SELECT nxCredit, votepoints FROM accounts WHERE id = ?',
      [userId]
    );

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Vote sites configuration with Gtop100 URL format
    const sites = [
      {
        id: 1,
        name: 'Gtop100',
        url: 'https://gtop100.com/topsites/MapleStory/sitedetails/MapleKaede-v83-117-104927?vote=1&pingUsername=',
        nx_reward: 8000,
        cooldown_hours: 24,
        icon: '🏆'
      }
    ];

    // Get vote status for each site
    const voteStatus: any = {};
    let todayRewards = 0;
    
    for (const site of sites) {
      const siteKey = site.name.toLowerCase().replace(/\s+/g, '');
      
      // Check last successful vote by this user
      const userVote = await queryOne<any>(
        `SELECT vote_time, nx_awarded FROM vote_logs 
         WHERE username = ? AND site = ? AND status = 'success'
         ORDER BY vote_time DESC 
         LIMIT 1`,
        [username, siteKey]
      );

      // Check IP cooldown
      const ipCooldown = await queryOne<any>(
        `SELECT last_vote_time FROM vote_ip_cooldowns 
         WHERE ip_hash = ? AND site = ? 
         AND last_vote_time > DATE_SUB(NOW(), INTERVAL ? HOUR)`,
        [hashedIp, siteKey, site.cooldown_hours]
      );

      // Get today's rewards
      const todayResult = await queryOne<any>(
        `SELECT SUM(nx_awarded) as today_nx FROM vote_logs 
         WHERE username = ? AND DATE(vote_time) = CURDATE() AND status = 'success'`,
        [username]
      );

      todayRewards = todayResult?.today_nx || 0;

      let voted = false;
      let canVoteAt = null;

      // Check user cooldown
      if (userVote) {
        const lastVoteTime = new Date(userVote.vote_time);
        const nextVoteTime = new Date(lastVoteTime.getTime() + (site.cooldown_hours * 60 * 60 * 1000));
        
        if (nextVoteTime > new Date()) {
          voted = true;
          canVoteAt = nextVoteTime.getTime();
        }
      }

      // Check IP cooldown (overrides user cooldown if later)
      if (ipCooldown) {
        const ipLastVoteTime = new Date(ipCooldown.last_vote_time);
        const ipNextVoteTime = new Date(ipLastVoteTime.getTime() + (site.cooldown_hours * 60 * 60 * 1000));
        
        if (ipNextVoteTime > new Date()) {
          voted = true;
          if (!canVoteAt || ipNextVoteTime.getTime() > canVoteAt) {
            canVoteAt = ipNextVoteTime.getTime();
          }
        }
      }

      voteStatus[siteKey] = {
        voted,
        pending: false,
        canVoteAt
      };
    }

    // Get vote statistics
    const stats = await queryOne<any>(
      `SELECT 
        COUNT(DISTINCT DATE(vote_time)) as days_voted,
        COUNT(*) as total_successful_votes,
        SUM(nx_awarded) as total_nx_earned
      FROM vote_logs 
      WHERE username = ? AND status = 'success'`,
      [username]
    );

    // Log for debugging in production
    console.log(`Vote status for ${username}: nxCredit=${user.nxCredit}`);

    return NextResponse.json({
      username,
      sites,
      voteStatus,
      todayRewards,
      currentNX: user.nxCredit || 0,  // Using nxCredit which is what votes update
      totalVotes: user.votepoints || 0,
      stats: {
        daysVoted: stats?.days_voted || 0,
        totalSuccessfulVotes: stats?.total_successful_votes || 0,
        totalNXEarned: stats?.total_nx_earned || 0
      }
    });

  } catch (error) {
    console.error('Vote status error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vote status' },
      { status: 500 }
    );
  }
});