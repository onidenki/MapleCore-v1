// src/app/api/dashboard/characters/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthenticatedRequest } from '@/lib/middleware/auth';
import { secureQueries } from '@/lib/db';

export const GET = requireAuth(async (req: AuthenticatedRequest) => {
  try {
    const userId = req.user!.userId;

    // Get all user's characters with appearance data
    const characters = await secureQueries.getCharactersByAccountId(userId);

    // Get equipment for all characters at once (more efficient)
    const characterIds = characters.map((char: any) => char.id);
    const allEquipment = await secureQueries.getCharactersEquipment(characterIds);

    // Format characters data with equipment
    const formattedCharacters = characters.map((char: any) => {
      // Get equipment for this character from the batch query
      const equipment = allEquipment[char.id] || {};

      // Debug log equipment for first character
      if (char.id === 1) {
        console.log('Character 1 equipment from DB:', equipment);
      }

      // Calculate exp percentage (simplified)
      const expToNextLevel = getExpForLevel(char.level + 1);
      const expCurrentLevel = getExpForLevel(char.level);
      const expProgress = expToNextLevel > expCurrentLevel ? 
        Math.floor(((char.exp - expCurrentLevel) / (expToNextLevel - expCurrentLevel)) * 100) : 0;

      return {
        id: char.id,
        name: char.name,
        level: char.level,
        job: getJobName(char.job),
        jobId: char.job,
        exp: Math.max(0, Math.min(100, expProgress)),
        meso: char.meso || 0,
        // Add appearance data
        skincolor: char.skincolor || 0,
        gender: char.gender || 0,
        hair: char.hair || 30000,
        face: char.face || 20000,
        // Add stats
        stats: {
          str: char.str || 4,
          dex: char.dex || 4,
          int: char.int || 4,
          luk: char.luk || 4
        },
        // Add equipment - this now includes proper cash item override logic
        equipment: equipment,
        // Additional useful data
        fame: char.fame || 0,
        map: char.map || 0,
        guildid: char.guildid || 0
      };
    });

    return NextResponse.json({ characters: formattedCharacters });

  } catch (error) {
    console.error('Characters error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch characters' },
      { status: 500 }
    );
  }
});

// Helper function to get exp required for level (simplified)
function getExpForLevel(level: number): number {
  if (level <= 1) return 0;
  if (level <= 15) return Math.floor(level * level * level / 3);
  if (level <= 30) return Math.floor(level * level * level * 1.2);
  return Math.floor(level * level * level * 1.5);
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