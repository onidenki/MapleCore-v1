// src/app/api/dashboard/rankings/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyToken } from '@/lib/security/password';
import { secureQueries } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Get auth token from cookie (optional for rankings)
    const token = request.cookies.get('auth-token')?.value;
    let currentUserId = null;
    
    if (token) {
      try {
        const decoded = verifyToken(token);
        currentUserId = decoded.userId;
      } catch (e) {
        // Token invalid, but we can still show rankings
      }
    }

    // Get top characters with guild information and character data
    const rankings = await query<any>(
      `SELECT 
        c.id,
        c.name,
        c.level,
        c.exp,
        c.job,
        c.fame,
        c.accountid,
        c.guildid,
        c.skincolor,
        c.gender,
        c.hair,
        c.face,
        c.str,
        c.dex,
        c.int,
        c.luk,
        c.meso,
        g.name as guild_name
      FROM characters c
      LEFT JOIN guilds g ON c.guildid = g.guildid AND c.guildid > 0
      WHERE c.gm >= 0
      ORDER BY c.level DESC, c.exp DESC
      LIMIT 100`
    );

    // Get equipment for all characters at once
    const characterIds = rankings.map((char: any) => char.id);
    const allEquipment = await secureQueries.getCharactersEquipment(characterIds);

    // Format rankings
    const formattedRankings = rankings.map((char: any, index: number) => ({
      rank: index + 1,
      id: char.id,
      name: char.name,
      level: char.level,
      exp: char.exp,
      job: getJobName(char.job),
      jobId: char.job,
      guild: char.guild_name || '',
      fame: char.fame || 0,
      accountId: char.accountid,
      isCurrentUser: currentUserId === char.accountid,
      // Add character appearance data
      skincolor: char.skincolor || 0,
      gender: char.gender || 0,
      hair: char.hair || 30000,
      face: char.face || 20000,
      equipment: allEquipment[char.id] || {},
      stats: {
        str: char.str || 4,
        dex: char.dex || 4,
        int: char.int || 4,
        luk: char.luk || 4
      },
      meso: char.meso || 0
    }));

    // Find user's ranking if logged in
    let userRanking = null;
    if (currentUserId) {
      // Check if user is in top 100
      const userCharsInRankings = formattedRankings.filter(char => char.isCurrentUser);
      
      if (userCharsInRankings.length > 0) {
        // Get the best ranked character
        userRanking = userCharsInRankings.reduce((best, current) => 
          current.rank < best.rank ? current : best
        );
      } else {
        // Find user's best character overall
        const [userChar] = await query<any>(
          `SELECT 
            c.id,
            c.name,
            c.level,
            c.exp,
            c.job,
            c.fame,
            c.guildid,
            c.skincolor,
            c.gender,
            c.hair,
            c.face,
            c.str,
            c.dex,
            c.int,
            c.luk,
            c.meso,
            g.name as guild_name,
            (
              SELECT COUNT(*) + 1 
              FROM characters c2 
              WHERE c2.gm >= 0
              AND (c2.level > c.level OR (c2.level = c.level AND c2.exp > c.exp))
            ) as user_rank
          FROM characters c
          LEFT JOIN guilds g ON c.guildid = g.guildid AND c.guildid > 0
          WHERE c.accountid = ? AND c.gm >= 0
          ORDER BY c.level DESC, c.exp DESC
          LIMIT 1`,
          [currentUserId]
        );

        if (userChar) {
          // Get equipment for this user character
          const userEquipment = await secureQueries.getCharacterEquipment(userChar.id);
          
          userRanking = {
            rank: userChar.user_rank,
            id: userChar.id,
            name: userChar.name,
            level: userChar.level,
            exp: userChar.exp,
            job: getJobName(userChar.job),
            jobId: userChar.job,
            guild: userChar.guild_name || '',
            fame: userChar.fame || 0,
            accountId: currentUserId,
            isCurrentUser: true,
            // Add character appearance data for user ranking
            skincolor: userChar.skincolor || 0,
            gender: userChar.gender || 0,
            hair: userChar.hair || 30000,
            face: userChar.face || 20000,
            equipment: userEquipment,
            stats: {
              str: userChar.str || 4,
              dex: userChar.dex || 4,
              int: userChar.int || 4,
              luk: userChar.luk || 4
            },
            meso: userChar.meso || 0
          };
        }
      }
    }

    return NextResponse.json({ 
      rankings: formattedRankings,
      userRanking
    });

  } catch (error) {
    console.error('Rankings error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rankings' },
      { status: 500 }
    );
  }
}

// Helper function to convert job ID to job name
function getJobName(jobId: number): string {
  const jobMap: { [key: number]: string } = {
    0: 'Beginner',
    100: 'Warrior',
    110: 'Fighter',
    111: 'Crusader',
    112: 'Hero',
    120: 'Page',
    121: 'White Knight',
    122: 'Paladin',
    130: 'Spearman',
    131: 'Dragon Knight',
    132: 'Dark Knight',
    200: 'Magician',
    210: 'F/P Wizard',
    211: 'F/P Mage',
    212: 'F/P Archmage',
    220: 'I/L Wizard',
    221: 'I/L Mage',
    222: 'I/L Archmage',
    230: 'Cleric',
    231: 'Priest',
    232: 'Bishop',
    300: 'Bowman',
    310: 'Hunter',
    311: 'Ranger',
    312: 'Bow Master',
    320: 'Crossbowman',
    321: 'Sniper',
    322: 'Crossbow Master',
    400: 'Thief',
    410: 'Assassin',
    411: 'Hermit',
    412: 'Night Lord',
    420: 'Bandit',
    421: 'Chief Bandit',
    422: 'Shadower',
    500: 'Pirate',
    510: 'Brawler',
    511: 'Marauder',
    512: 'Buccaneer',
    520: 'Gunslinger',
    521: 'Outlaw',
    522: 'Corsair'
  };

  return jobMap[jobId] || 'Unknown';
}