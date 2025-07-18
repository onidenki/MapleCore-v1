import React, { useRef, useEffect, useState } from 'react';
import { Character, CharacterEquipment } from '@/types/api';

interface CharacterRendererProps {
  character: Character;
  scale?: number;
}

const CharacterRenderer: React.FC<CharacterRendererProps> = ({ character, scale = 2 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [imageCache, setImageCache] = useState<{ [key: string]: HTMLImageElement | null }>({});

  // Constants from PHP (exact same values)
  const mainX = 100;  // Centered horizontally (200/2 = 100)
  const mainY = 90;   // Slightly above center for better visual balance
  const neckY = 121;  // Adjusted accordingly (90 + 31 offset from original)
  const CANVAS_WIDTH = 200;
  const CANVAS_HEIGHT = 200;

  // Default gender clothes (exact same as PHP)
  const defaultClothes: { [key: number]: { coat: number; pants: number } } = {
    0: { coat: 1040036, pants: 1060026 }, // Male
    1: { coat: 1041046, pants: 1061039 }  // Female
  };

  // Character properties (like PHP class properties)
  let stand = 1;
  let vSlot = "";

  // Character data structures (like PHP setVaribles)
  let characterData: { [key: string]: { ID: string | number; xml: Document | null } } = {};

  // Helper: Check if file exists (like PHP exists() method)
  const exists = async (path: string): Promise<boolean> => {
    try {
      const response = await fetch(`/assets/maplestory/${path}`, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  };

  // Helper: Load XML (like PHP XMLoader method)
  const XMLoader = async (path: string): Promise<Document | null> => {
    try {
      if (!await exists(path + "coord.xml")) return null;
      
      const response = await fetch(`/assets/maplestory/${path}coord.xml`);
      if (!response.ok) return null;
      
      const text = await response.text();
      const parser = new DOMParser();
      return parser.parseFromString(text, "text/xml");
    } catch {
      return null;
    }
  };

  // Helper: Get XML value (like PHP accessing XML properties)
  const getXMLValue = (xml: Document | null, path: string): string | null => {
    if (!xml) return null;
    
    const parts = path.split('.');
    let current: Element | null = xml.documentElement;
    
    for (const part of parts) {
      if (!current) return null;
      
      // Search through children by tag name (case-insensitive)
      current = Array.from(current.children).find(child => 
        child.tagName === part || child.tagName.toLowerCase() === part.toLowerCase()
      ) || null;
    }
    
    return current?.textContent || null;
  };

  const getXMLNumber = (xml: Document | null, path: string): number => {
    const value = getXMLValue(xml, path);
    return value ? parseInt(value, 10) : 0;
  };

  // Helper: Use/load image
  const useImage = async (location: string, x: number = 0, y: number = 0): Promise<void> => {
    if (!await exists(location)) {
      return;
    }
    
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    // Check cache first
    if (imageCache[location] !== undefined) {
      const img = imageCache[location];
      if (img) {
        ctx.drawImage(img, x, y);
      }
      return;
    }

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        setImageCache(prev => ({ ...prev, [location]: img }));
        ctx.drawImage(img, x, y);
        resolve();
      };
      img.onerror = () => {
        setImageCache(prev => ({ ...prev, [location]: null }));
        resolve();
      };
      img.src = `/assets/maplestory/${location}`;
    });
  };

  // setVaribles method
  const setVaribles = async (): Promise<void> => {
    const dataMap = {
      "Skin": character.skincolor,
      "Gender": character.gender,
      "Hair": character.hair,
      "Face": character.face,
      "Cap": character.equipment?.cap,
      "Mask": character.equipment?.mask,
      "Eyes": character.equipment?.eyes,
      "Ears": character.equipment?.ears,
      "Coat": character.equipment?.coat,
      "Pants": character.equipment?.pants,
      "Shoes": character.equipment?.shoes,
      "Glove": character.equipment?.glove,
      "Cape": character.equipment?.cape,
      "Shield": character.equipment?.shield,
      "Weapon": character.equipment?.weapon || 1
    };

    for (const [key, value] of Object.entries(dataMap)) {
      if (value !== undefined && value !== null) {
        let processedValue: string | number = value;
        let pathPrefix = "0"; // Default prefix for most items
        
        // Special formatting for different types
        if (key === "Hair" || key === "Face") {
          processedValue = `00${value}`;
        } else if (key === "Weapon" && typeof value === 'number') {
          processedValue = value.toString().padStart(8, '0');
          pathPrefix = "";
        }
        
        const xml = await XMLoader(`${key}/${pathPrefix}${processedValue}.img/`);
        characterData[key] = {
          ID: processedValue,
          xml: xml
        };
      }
    }
  };

  // setWepInfo method
  const setWepInfo = async (weapon: number): Promise<void> => {
    const weaponIdPadded = weapon.toString().padStart(8, '0');
    const Location = `Weapon/${weaponIdPadded}.img/`;
    
    if (await exists(Location + "coord.xml")) {
      const xml = await XMLoader(Location);
      if (xml && weapon < 1700000) {
        const standPaths = [
          '_info.stand.value',
          '_info.stand2.value', 
          '_info.stand1.value',
          '_info.stand'
        ];
        
        let foundStand = false;
        for (const path of standPaths) {
          const standValue = getXMLNumber(xml, path);
          if (standValue > 0) {
            stand = standValue;
            foundStand = true;
            break;
          }
        }
        
        if (!foundStand) {
          stand = 2;
        }
      } else {
        stand = 2;
      }
    } else {
      stand = 2;
    }
  };

  // setFace method
  const setFace = async (): Promise<void> => {
    if (characterData.Face?.ID) {
      if (!vSlot.includes('Fc')) {
        const xml = characterData.Face.xml;
        const faceX = mainX + getXMLNumber(xml, '_face.x');
        const faceY = mainY + getXMLNumber(xml, '_face.y');
        
        await useImage(`Face/0${characterData.Face.ID}.img/default.face.png`, faceX, faceY);
      }
    }
  };

  // setHair method
  const setHair = async (z: string): Promise<void> => {
    switch (z) {
      case "hair":
        if (!vSlot.includes('H3'))
          await setAHair(z);
        break;
      case "hairBelowBody":
        if (!vSlot.includes('H4'))
          await setAHair(z);
        break;
      case "hairBelowHead":
        if (!vSlot.includes('H2'))
          await setAHair(z);
        break;
      case "hairOverHead":
        if (!vSlot.includes('H5'))
          await setAHair(z);
        break;
      case "hairShade":
        if (!vSlot.includes('H1'))
          await setAHair(z);
        break;
    }
  };

  // setAHair method
  const setAHair = async (z: string): Promise<void> => {
    const zArray: { [key: string]: string[] } = {
      "hair": ["hair"],
      "hairBelowBody": ["hairBelowBody", "hairBelowHead"],
      "hairOverHead": ["hairOverHead"],
      "hairBelowHead": ["hairBelowHead"]
    };

    if (characterData.Hair?.ID) {
      const xml = characterData.Hair.xml;
      if (!xml) return;

      switch (z) {
        case "hair":
        case "hairBelowBody":
        case "hairBelowHead":
        case "hairOverHead":
          if (zArray[z]) {
            for (const type of zArray[z]) {
              const hair = `_${type}`;
              const hairElement = xml.querySelector(hair);
              if (hairElement) {
                const zValue = getXMLValue(xml, `${hair}._stand1.z`);
                if (zValue === z) {
                  const hairX = mainX + getXMLNumber(xml, `${hair}._stand1.x`);
                  const hairY = mainY + getXMLNumber(xml, `${hair}._stand1.y`);
                  await useImage(`Hair/0${characterData.Hair.ID}.img/default.${z}.png`, hairX, hairY);
                }
              }
            }
          }
          break;
        case "hairShade":
          const hair = `_${z}`;
          let sType = `_${characterData.Skin?.ID}`;
          let sK = characterData.Skin?.ID;
          
          const shadeElement = xml.querySelector(`${hair}${sType}`);
          if (!shadeElement) {
            sType = "_0";
            sK = 0;
          }
          
          const shadeHairX = mainX + getXMLNumber(xml, `${hair}${sType}.x`);
          const shadeHairY = mainY + getXMLNumber(xml, `${hair}${sType}.y`);
          await useImage(`Hair/0${characterData.Hair.ID}.img/default.hairShade.${sK}.png`, shadeHairX, shadeHairY);
          break;
      }
    }
  };

  // setAccessory method
  const setAccessory = async (aType: string, z: string): Promise<void> => {
    const zArray: { [key: string]: string[] } = {
      "accessoryEye": ["default"],
      "accessoryEyeBelowFace": ["default"],
      "accessoryEyeOverCap": ["default"],
      "accessoryFace": ["default", "0"],
      "accessoryFaceBelowFace": ["default"],
      "accessoryFaceOverFaceBelowCap": ["default"],
      "accessoryEar": ["default"],
      "accessoryEarOverHair": ["default"],
      "capOverHair": ["default"],
      "hairOverHead": ["default"],
      "accessoryOverHair": ["default"],
      "capeOverHead": ["default"]
    };

    const accessoryData = characterData[aType];
    if (!accessoryData?.ID) return;

    const Location = `Accessory/0${accessoryData.ID}.img/`;
    if (await exists(Location + "coord.xml")) {
      const xml = await XMLoader(Location);
      if (!xml) return;

      const vslotValue = getXMLValue(xml, '_info.vslot');
      if (!vslotValue || !vSlot.includes(vslotValue)) {
        const types = zArray[z] || [];
        for (const type of types) {
          const accessory = `_${type}`;
          const accessoryElement = xml.querySelector(accessory);
          if (accessoryElement) {
            const zValue = getXMLValue(xml, `${accessory}._stand1.z`);
            if (zValue === z) {
              const accessoryX = mainX + getXMLNumber(xml, `${accessory}._stand1.x`);
              const accessoryY = mainY + getXMLNumber(xml, `${accessory}._stand1.y`);
              await useImage(`Accessory/0${accessoryData.ID}.img/default.${type}.png`, accessoryX, accessoryY);
            }
          }
        }
      }
    }
  };

  // setCap method
  const setCap = async (z: string): Promise<void> => {
    const zArray: { [key: string]: string[] } = {
      "cap": ["default", "default1", "default3", "defaultTail", "0"],
      "body": ["default"],
      "capBelowBody": ["default", "defaultAc"],
      "accessoryEyeOverCap": ["default"],
      "capBelowAccessory": ["default"],
      "backHairOverCape": ["default", "defaultBack"],
      "capAccessoryBelowAccFace": ["default", "defaultAc"],
      "backCap": ["default", "default1", "default2", "default4", "defaultTail", "defaultBelowBody", "defaultAc", "defaultback", "acc"],
      "capAccessoryBelowBody": ["default", "defaultAC", "defaultAc", "defaultBelowBody"],
      "backHair": ["default", "defaultAc"],
      "capBelowHead": ["default", "defaultBack"],
      "accessoryEar": ["default", "defaultB"],
      "capOverHair": ["default", "default2", "effect", "0"],
      "capeBelowBody": ["default", "defaultacc", "acc"],
      "0": ["default"]
    };

    if (characterData.Cap?.xml) {
      vSlot = getXMLValue(characterData.Cap.xml, '_info.vslot') || "";
      
      const types = zArray[z] || [];
      for (const type of types) {
        const cap = `_${type}`;
        const capElement = characterData.Cap.xml.querySelector(cap);
        if (capElement) {
          const zValue = getXMLValue(characterData.Cap.xml, `${cap}.stand1.z`);
          if (zValue === z) {
            const capX = mainX + getXMLNumber(characterData.Cap.xml, `${cap}.stand1.x`);
            const capY = mainY + getXMLNumber(characterData.Cap.xml, `${cap}.stand1.y`);
            
            if (await exists(`Cap/0${characterData.Cap.ID}.img/default.${type}.png`)) {
              await useImage(`Cap/0${characterData.Cap.ID}.img/default.${type}.png`, capX, capY);
            } else if (await exists(`Cap/0${characterData.Cap.ID}.img/stand1.0.${type}.png`)) {
              await useImage(`Cap/0${characterData.Cap.ID}.img/stand1.0.${type}.png`, capX, capY);
            }
          }
        }
      }
    }
  };

  // setCape method
  const setCape = async (z: string): Promise<void> => {
    const zArray: { [key: string]: string[] } = {
      "cape": ["cape", "capeArm", "capeOverHead", "capeOverArm"],
      "backWing": ["cape"],
      "capeBelowBody": ["cape", "capeOverArm"],
      "capOverHair": ["cape"],
      "capeOverHead": ["cape", "capeArm", "capeOverHead", "cape3"]
    };

    if (characterData.Cape?.xml) {
      const types = zArray[z] || [];
      for (const type of types) {
        const cape = `_${type}`;
        const capeElement = characterData.Cape.xml.querySelector(cape);
        if (capeElement) {
          const zValue = getXMLValue(characterData.Cape.xml, `${cape}.stand1.z`);
          if (zValue === z) {
            const capeX = mainX + getXMLNumber(characterData.Cape.xml, `${cape}.stand1.x`);
            const capeY = neckY + getXMLNumber(characterData.Cape.xml, `${cape}.stand1.y`);
            await useImage(`Cape/0${characterData.Cape.ID}.img/stand1.0.${type}.png`, capeX, capeY);
          }
        }
      }
    }
  };

  // setShield method
  const setShield = async (z?: string): Promise<void> => {
    if (!characterData.Shield?.ID) return;

    const shieldId = characterData.Shield.ID as number;
    
    if (shieldId < 1090000) {
      await setWeapon("weaponOverArmBelowHead");
    } else if (shieldId > 1340000 && shieldId < 1360000) {
      return;
    } else if (characterData.Shield.xml && z == null) {
      const shieldX = mainX + getXMLNumber(characterData.Shield.xml, '_shield.stand1.x');
      const shieldY = neckY + getXMLNumber(characterData.Shield.xml, '_shield.stand1.y');
      await useImage(`Shield/0${characterData.Shield.ID}.img/stand1.0.shield.png`, shieldX, shieldY);
    }
  };

  // setShoes method
  const setShoes = async (z: string): Promise<void> => {
    const zArray: { [key: string]: string[] } = {
      "shoes": ["shoes"],
      "weaponOverBody": ["shoes"],
      "shoesTop": ["shoes"],
      "shoesOverPants": ["shoes"],
      "pantsOverMailChest": ["shoes"],
      "gloveWristBelowMailArm": ["shoes"],
      "capAccessoryBelowBody": ["shoesBack"]
    };

    if (characterData.Shoes?.xml) {
      const types = zArray[z] || [];
      for (const type of types) {
        const shoes = `_${type}`;
        const shoesElement = characterData.Shoes.xml.querySelector(shoes);
        if (shoesElement) {
          const zValue = getXMLValue(characterData.Shoes.xml, `${shoes}._stand1.z`);
          if (zValue === z) {
            const shoesX = mainX + getXMLNumber(characterData.Shoes.xml, `${shoes}._stand1.x`);
            const shoesY = neckY + getXMLNumber(characterData.Shoes.xml, `${shoes}._stand1.y`);
            await useImage(`Shoes/0${characterData.Shoes.ID}.img/stand1.0.${type}.png`, shoesX, shoesY);
          }
        }
      }
    }
  };

  // setGlove method
  const setGlove = async (pos: string, standParam?: number): Promise<void> => {
    const canvasArray: { [key: string]: { [key: string]: string[] } } = {
      "r": { 
        "stand1": ["rGlove", "rWrist", "gloveOverHead"], 
        "stand2": ["rGlove", "rWrist"] 
      },
      "l": { 
        "stand1": ["lGlove", "lWrist", "gloveOverBody"], 
        "stand2": ["lGlove", "lWrist", "gloveOverHand", "lGlove2"] 
      }
    };

    if (characterData.Glove?.xml) {
      const snd = `_stand${stand}`;
      const ss = `stand${stand}`;
      
      if (!(pos === 'l' && standParam === 2 && stand === 1)) {
        const canvases = canvasArray[pos]?.[ss] || [];
        for (const canvas of canvases) {
          if (await exists(`Glove/0${characterData.Glove.ID}.img/${ss}.0.${canvas}.png`)) {
            const type = `_${canvas}`;
            const gloveX = mainX + getXMLNumber(characterData.Glove.xml, `${type}.${snd}.x`);
            const gloveY = neckY + getXMLNumber(characterData.Glove.xml, `${type}.${snd}.y`);
            
            await useImage(`Glove/0${characterData.Glove.ID}.img/${ss}.0.${canvas}.png`, gloveX, gloveY);
          }
        }
      }
    }
  };

  // setPants method
  const setPants = async (): Promise<void> => {
    if (!characterData.Pants?.ID) {
      const defaultPantsId = defaultClothes[characterData.Gender?.ID as number]?.pants;
      if (defaultPantsId) {
        await useImage(`Pants/0${defaultPantsId}.img/stand1.0.pants.png`, mainX - 3, neckY + 1);
      }
    } else if ((characterData.Coat?.ID as number) >= 1050000) {
      return;
    } else if (characterData.Pants.xml) {
      const snd = `_stand${stand}`;
      const pantsX = mainX + getXMLNumber(characterData.Pants.xml, `_pants${snd}.x`);
      const pantsY = neckY + getXMLNumber(characterData.Pants.xml, `_pants${snd}.y`);

      if (await exists(`Pants/0${characterData.Pants.ID}.img/stand2.0.pants.png`) && stand === 2) {
        await useImage(`Pants/0${characterData.Pants.ID}.img/stand2.0.pants.png`, pantsX, pantsY);
      } else {
        await useImage(`Pants/0${characterData.Pants.ID}.img/stand1.0.pants.png`, pantsX, pantsY);
      }
    }
  };

  // setCoat method
  const setCoat = async (type: string): Promise<void> => {
    const coatId = characterData.Coat?.ID as number;
    const folder = (coatId >= 1050000) ? "Longcoat" : "Coat";
    
    if (!characterData.Coat?.ID) {
      const defaultCoatId = defaultClothes[characterData.Gender?.ID as number]?.coat;
      if (defaultCoatId) {
        await useImage(`Coat/0${defaultCoatId}.img/stand1.0.mail.png`, mainX - 3, neckY - 9);
      }
    } else {
      const Location = `${folder}/0${characterData.Coat.ID}.img/`;
      
      if (await exists(Location + "coord.xml")) {
        const xml = await XMLoader(Location);
        if (xml) {
          const snd = `stand${stand}`;
          
          switch (type) {
            case "mail":
              const mailX = mainX + getXMLNumber(xml, `_mail.${snd}.x`);
              const mailY = neckY + getXMLNumber(xml, `_mail.${snd}.y`);
              
              if (await exists(`${Location}stand2.0.mail.png`) && stand === 2) {
                await useImage(`${Location}stand2.0.mail.png`, mailX, mailY);
              } else {
                await useImage(`${Location}stand1.0.mail.png`, mailX, mailY);
              }
              break;
            case "mailArm":
              const mailArmX = mainX + getXMLNumber(xml, `_mailArm.${snd}.x`);
              const mailArmY = neckY + getXMLNumber(xml, `_mailArm.${snd}.y`);
              await useImage(`${Location}stand${stand}.0.mailArm.png`, mailArmX, mailArmY);
              break;
          }
        }
      }
    }
  };

  // setWeapon method
  const setWeapon = async (z: string): Promise<void> => {
    const wepArray: { [key: string]: string[] } = {
      "weapon": ["weapon", "effect", "weaponFront"],
      "weaponBelowArm": ["weapon", "weaponBelowArm", "ex"],
      "weaponBelowBody": ["weapon", "weaponBelowBody"],
      "weaponOverArm": ["weapon", "weaponOverArm", "string", "weaponOverGlove", "weaponOverGlve"],
      "weaponOverArmBelowHead": ["weapon", "weaponL"],
      "weaponOverBody": ["weapon", "weaponOverBody", "weaponL"],
      "weaponOverGlove": ["weapon", "belt"],
      "weaponOverHand": ["weapon", "weaponOverHand"],
      "weaponWristOverGlove": ["weapon", "weaponWrist"],
      "armBelowHeadOverMailChest": ["weapon"],
      "gloveWristBelowWeapon": ["weapon"],
      "weaponOverGloveBelowMailArm": ["weapon"],
      "backWeapon": ["weapon"],
      "handBelowWeapon": ["weaponL"],
      "characterEnd": ["effect"],
      "emotionOverBody": ["effect"]
    };

    // Special case for secondary weapons
    if (z === "weaponOverArmBelowHead" && characterData.Shield?.ID && 
        (characterData.Shield.ID as number) > 1340000 && (characterData.Shield.ID as number) < 1350000) {
      const Location = `Weapon/${characterData.Shield.ID}.img/`;
      if (await exists(Location + "coord.xml")) {
        const xml = await XMLoader(Location);
        if (xml) {
          const weaponStandValue = getXMLNumber(xml, '_info.stand.value');
          const snd = `_stand${weaponStandValue}`;
          const ss = `stand${weaponStandValue}`;
          const shieldX = mainX + getXMLNumber(xml, `_weapon.${snd}.x`);
          const shieldY = neckY + getXMLNumber(xml, `_weapon.${snd}.y`);
          await useImage(`Weapon/${characterData.Shield.ID}.img/${ss}.0.weapon.png`, shieldX, shieldY);
        }
      }
      return;
    }

    if (characterData.Weapon?.xml) {
      const snd = `_stand${stand}`;
      const ss = `stand${stand}`;
      
      // Get weapon NUM value
      let wepNUM = "";
      const numPaths = [
        `_info.${ss}.NUM`,
        '_info.stand1.NUM',
        '_info.stand2.NUM',
        '_info.NUM'
      ];
      
      for (const path of numPaths) {
        const value = getXMLValue(characterData.Weapon.xml, path);
        if (value) {
          wepNUM = value;
          break;
        }
      }

      const types = wepArray[z] || [];
      
      for (const type of types) {
        const weap = `_${type}`;
        const weapElement = characterData.Weapon.xml.querySelector(weap);
        if (weapElement) {
          const zValue = getXMLValue(characterData.Weapon.xml, `${weap}.${snd}.z`);
          
          if (zValue === z) {
            const wepX = mainX + getXMLNumber(characterData.Weapon.xml, `${weap}.${snd}.x`);
            const wepY = neckY + getXMLNumber(characterData.Weapon.xml, `${weap}.${snd}.y`);
            
            // Build correct image path
            let imagePath: string;
            if (wepNUM) {
              imagePath = `Weapon/${characterData.Weapon.ID}.img/${wepNUM}.${ss}.0.${type}.png`;
            } else {
              imagePath = `Weapon/${characterData.Weapon.ID}.img/${ss}.0.${type}.png`;
            }
            
            const imageExists = await exists(imagePath);
            
            if (imageExists) {
              await useImage(imagePath, wepX, wepY);
            } else {
              // Try with different stand values
              const otherStand = stand === 1 ? 2 : 1;
              const altSs = `stand${otherStand}`;
              let altImagePath: string;
              
              if (wepNUM) {
                altImagePath = `Weapon/${characterData.Weapon.ID}.img/${wepNUM}.${altSs}.0.${type}.png`;
              } else {
                altImagePath = `Weapon/${characterData.Weapon.ID}.img/${altSs}.0.${type}.png`;
              }
              
              const altExists = await exists(altImagePath);
              
              if (altExists) {
                const altSnd = `_stand${otherStand}`;
                const altWepX = mainX + getXMLNumber(characterData.Weapon.xml, `${weap}.${altSnd}.x`);
                const altWepY = neckY + getXMLNumber(characterData.Weapon.xml, `${weap}.${altSnd}.y`);
                
                await useImage(altImagePath, altWepX, altWepY);
              }
            }
            break;
          }
        }
      }
    }
  };

  // createBody method
  const createBody = async (type: string): Promise<void> => {
    const skin = `0000${2000 + (characterData.Skin?.ID as number)}`;
    
    switch (type) {
      case "head":
        await useImage(`Skin/${skin}.img/front.head.png`, mainX - 15, mainY - 12);
        break;
      case "body":
        await useImage(`Skin/${skin}.img/stand${stand}.0.body.png`, (mainX + stand) - 9, mainY + 21);
        break;
      case "arm":
        await useImage(`Skin/${skin}.img/stand${stand}.0.arm.png`, mainX + (stand === 2 ? 4 : 8), mainY + 23);
        break;
      case "hand":
        if (stand === 2) {
          await useImage(`Skin/${skin}.img/stand2.0.hand.png`, mainX - 10, mainY + 26);
        }
        break;
    }
  };

  // Main render function
  const renderCharacter = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsLoading(true);
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    try {
      await setVaribles();
      
      const weaponId = character.equipment?.weapon || 1;
      await setWepInfo(weaponId);

      // Render sequence
      await setWeapon('weaponBelowBody');
      await setCap('capeBelowBody');
      await setCap('capBelowHead');
      await setCap('capAccessoryBelowBody');
      await setCape('cape');
      await setCape('backWing');
      await setCap('backCap');
      await setCape('capeBelowBody');
      await setCap('capeBelowBody');
      await setShield();
      await setHair('hairBelowBody');
      await setShoes('capAccessoryBelowBody');
      await setWeapon('weaponOverArmBelowHead');
      await createBody('body');
      await setShoes('shoes');
      await setShoes('weaponOverBody');
      await setGlove('l');
      await setWeapon('weaponOverBody');
      await setPants();
      await setCoat('mail');
      await setShoes('shoesTop');
      await setShoes('shoesOverPants');
      await setShoes('pantsOverMailChest');
      await setShoes('gloveWristBelowMailArm');
      await setWeapon('armBelowHeadOverMailChest');
      await setHair('hairBelowHead');
      await setCap('capBelowHead');
      await createBody('head');
      await setAccessory('Ears', 'accessoryEar');
      await setCap('backHairOverCape');
      await setCap('backHair');
      await setHair('hairShade');
      await setCap('capAccessoryBelowAccFace');
      await setAccessory('Mask', 'accessoryFaceBelowFace');
      await setAccessory('Eyes', 'accessoryEyeBelowFace');
      await setFace();
      await setAccessory('Mask', 'accessoryFace');
      await setCap('accessoryEyeOverCap'); 
      await setAccessory('Eyes', 'accessoryEye');
      await setCap('accessoryEar');
      await setHair('hair');
      await setHair('hairOverHead');
      await setAccessory('Ears', 'accessoryEarOverHair');
      await setAccessory('Eyes', 'accessoryOverHair');
      await setAccessory('Eyes', 'hairOverHead');
      await setCap('capBelowAccessory');
      await setCap('0');
      await setCap('cap');
      await setCap('body');
      await setCap('capOverHair');
      await setAccessory('Mask', 'capOverHair');
      await setAccessory('Eyes', 'accessoryEyeOverCap');
      await setAccessory('Mask', 'capeOverHead');
      await setCape('capeOverHead');
      await setCape('capOverHair');
      await setWeapon('weapon');
      await createBody('arm');
      await setShield('weaponOverArmBelowHead');
      await setWeapon('weaponBelowArm');
      await setCoat('mailArm');
      await setCape('capeArm');
      await setWeapon('weaponOverArm');
      await createBody('hand');
      await setGlove('l', 2);
      await setGlove('r');
      await setWeapon('weaponOverHand');
      await setWeapon('weaponOverGlove');
      await setWeapon('weaponWristOverGlove');
      await setWeapon('emotionOverBody');
      await setWeapon('characterEnd');

    } catch (error) {
      console.error('Render Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    renderCharacter();
  }, [character]);

  return (
    <div className="relative inline-block">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        style={{
          width: CANVAS_WIDTH * scale,
          height: CANVAS_HEIGHT * scale,
          imageRendering: 'pixelated'
        }}
        className="bg-transparent"
      />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50 rounded">
          <div className="w-6 h-6 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
};

export default CharacterRenderer;