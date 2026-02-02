/**
 * Scene metadata generated from CSV annotations
 * Only includes scenes with available GLB files
 */

// Featured room scene IDs displayed first in order
const FEATURED_ROOM_IDS = [114, 164, 178, 132, 158, 33, 51, 134];

// Featured house scene IDs displayed first in order
const FEATURED_HOUSE_IDS = [190, 208, 196, 201, 98];

// Available room scene IDs (48 total)
const ROOM_IDS = [4, 7, 13, 19, 20, 32, 33, 36, 41, 45, 51, 61, 68, 72, 77, 81, 85, 88, 100, 102, 103, 108, 109, 111, 112, 114, 118, 119, 121, 129, 132, 134, 139, 142, 144, 157, 158, 164, 167, 169, 174, 175, 176, 177, 178, 180, 183, 184];

// Available house scene IDs (31 total)
const HOUSE_IDS = [47, 49, 98, 99, 185, 186, 187, 188, 190, 191, 192, 193, 194, 195, 196, 197, 198, 199, 200, 201, 202, 203, 204, 205, 206, 207, 208, 209];

// All prompts from CSV indexed by ID
const PROMPTS = {
  4: "A bedroom with two bunk beds in the corners of the room, a desk placed against the wall far from the door, and a light hanging from the ceiling in the center of the room.",
  7: "A living room with a TV, sofa, and bookshelf. There is no coffee table in the room.",
  13: "A living room with a sofa against the wall across from the door, a painting on the wall above the sofa, and a pendant light hanging in the middle of the room.",
  19: "A dining room with a ceiling light hanging above the table and two chairs on the long side of the table.",
  20: "A bedroom with a bed with two nightstands on each side, a wardrobe, and a TV stand positioned in front of the bed. There is a toy box with two dolls outside the box.",
  32: "A Japanese-style living room featuring a coffee table next to the window with two floor cushions placed beside it. A sofa is positioned across from the window, and in front of the sofa is a table with a teapot on top, completing the serene and minimalist setup.",
  33: "A living room featuring an irregular-shaped table in the middle of the room with a sofa positioned in front of it. Across the table are two sofa chairs with a small wooden coffee table placed between them. A clock is mounted on the wall far from the door.",
  36: "A dining room with six wooden dining chairs surrounding a round wooden table in the middle of the room. There is no coffee table in the room.",
  41: "A teenager's bedroom features a comfortable twin bed with a backboard in the far corner, with boxes underneath it. At the foot of the bed is a small desk equipped with a monitor, an external keyboard and mouse, and a desk lamp on the right for visibility, accompanied by a rolling chair. Next to the bed, a nightstand with an additional floor lamp nearby provides space for a phone and other valuables. A sizable wooden wardrobe with multiple drawers offers ample storage for clothes, while a coffee table beside it holds books and board games. In the center of the room, a tan-colored rug creates a cozy spot to sit, and the walls are adorned with various posters and pictures.",
  45: "A modern living room featuring four sofa chairs surrounding a circular ceramic table, with two floor lamps positioned adjacent to the table. All the furniture is set on a large rectangular rug in the middle of the room. A large wooden tray with two glass bowls rests on top of the table. A mirror is mounted on the wall next to the window, flanked by a wall lamp on each side.",
  47: "A medium-sized bedroom featuring a queen-size bed with a nightstand on each side. A TV is mounted on the wall directly across from the bed, providing convenient viewing. The room includes a walk-in closet equipped with three wardrobes for clothes and two large mirrors.",
  48: "A master bedroom with a king-size bed, an attached walk-in closet, and a master bathroom. A desk is positioned in one corner of the room for working, there is a laptop on the right side of the desk and a wallet on the left side. There are also two sofa chairs next to the window. There is a sink mounted in the bathroom with a soap on the left side.",
  49: "The space includes three rooms: a spacious living room with an L-shaped sectional sofa facing a wall-mounted TV and a rectangular coffee table in front, holding a small serving tray with napkins. The dining room features an extending dining table surrounded by six chairs, a sleek sideboard with cups and sodas on top, two wall sconces providing soft lighting, and a small bar cart loaded with bottles in the corner. The modern kitchen boasts a central bar table with four bar stools on the long side, a bar table holding a charcuterie board with plates beside it, and a wine cooler in the corner.",
  51: "A simple bedroom featuring a full bed flanked by two bedside lamps, with a large wardrobe positioned directly facing the bed.",
  61: "This playroom features a large colorful rug at its center, with a play kitchen set against one wall and a rocking horse placed on the rug.",
  68: "In this basement, a pool table occupies the center of the room, with two bar stools lined up at a nearby bar table, allowing for social gatherings and entertainment.",
  72: "A bedroom with a modern queen bed against the main wall. Two bedside tables stand on either side, while a small writing desk is positioned in the corner next to the window, equipped with a cute desk lamp. A wicker basket lies at the foot of the bed.",
  77: "A dining room featuring a simple rectangular table, a corner shelf filled with cookbooks, and a pendant light hanging from the ceiling.",
  81: "This engaging playroom features a small painting stand positioned next to the window, a bookshelf full of toys standing against the nearby wall, and a cozy reading chair set across from the door.",
  85: "This cozy kitchen features a rustic wooden dining table positioned against the window, surrounded by four chairs. A sideboard against the wall is equipped with a coffee maker and a small herb planter.",
  88: "This versatile basement features a large sofa and an area rug in the center, creating a cozy movie area, while a small treadmill is positioned in the corner for quick exercise sessions. A mini chalkboard hangs on the wall next to a wall clock.",
  97: "This is a modern bedroom with a spa-like bathroom. The bedroom has a queen-size bed with vibrant pillows. A sleek dresser sits against one wall, adorned with a small jewelry box and a decorative mirror. A reading corner includes an armchair and a small side table. Adjacent to the bedroom, the bathroom features a large bathtub next to a frosted window. A vanity opposite the tub holds two sinks with skincare products.",
  98: "This cozy bedroom features a full-size bed against a wall with two nightstands on each side where the left one has a small clock. A small desk sits in the corner with a comfortable chair for studying or working. Opposite the bed, a spacious dresser provides additional storage. Adjacent to the bedroom, the living room has a recliner and an ottoman facing a low coffee table with a small vase and magazines. A large bookshelf in the corner holds books and board games, while a wide couch provides space for gatherings. Just off the living room, a small gaming room with a gaming console and two beanbag chairs offers a dedicated space for entertainment, complete with a small shelf for controllers and headsets.",
  99: "This bedroom has a full-size bed against a wall with a cartoon painting above. Two nightstands on each side of the bed provide storage. A writing desk in the corner holds a modern lamp for task lighting. A large wardrobe stands next to the door for additional storage. Beside the bedroom is a cozy living room with a large sofa facing a sleek coffee table where puzzles and decorative coasters reside. A bookshelf in the corner displays books and family pictures. The stylish bathroom includes a bathtub, with a toilet in the corner. The vanity features a double sink, with toiletries and white candles on top. A wicker basket at the foot of the bathtub holds towels.",
  100: "A pet store with aquariums along one wall, exactly two shelf units where one displays pet food bags and the other displays pet toys, pet beds on the floor, and a checkout counter near the entrance.",
  102: "A small grocery store with two refrigerated display cases along one wall. Two tables near the entrance hold produce bins, each containing at least three fruits. At least four shopping baskets are stacked by the door.",
  103: "A pharmacy with a pharmacy counter in the back of the room. Two shelves stand against the walls, each holding at least four medicine bottles. Three waiting chairs are arranged near the counter.",
  108: "A hotel lobby with a reception desk in the back of the room. A seating area in the center features two sofas facing each other with a coffee table between them. A luggage cart stands near the entrance, and a large chandelier hangs from the ceiling.",
  109: "A hotel room with a queen bed flanked by two nightstands, a desk with a chair, and a luggage rack in the corner.",
  111: "A cafe with a bar counter along one wall featuring a coffee machine, a filter coffee stand, and stacks of stone coffee cups. Three small round tables with two chairs each are arranged in the center. A chalkboard menu hangs on the wall behind the counter.",
  112: "A bar with a long wooden bar counter and five bar stools. Shelves behind the counter display bottles. Two high tables with two stools each are near the window.",
  114: "A private office with a desk and office chair, a shelf with books against the wall, and two guest chairs facing the desk.",
  118: "A classroom with six student desks, each with a chair. A teacher's desk sits at the front near the chalkboard, which hangs on the wall.",
  119: "A library with shelves containing books, reading tables with chairs, and a commercial printer.",
  121: "An art studio with easels, stools, and a supply cabinet in the corner.",
  129: "A yoga studio with yoga mats on the floor, a mirror on the wall, and meditation cushions in the corner.",
  132: "A robotics lab with two workbenches with robotic arms. Tool shelves on the wall hold tools, and a 3D printer sits in the corner.",
  134: "A garage with a car, a workbench, tires stacked in the corner, and a ladder against the wall.",
  139: "A nail salon with two manicure tables, each with a chair and a stool, and a shelf with nail polish bottles.",
  142: "A pet grooming salon with a grooming table, a bathtub, and a cage for pets in the corner.",
  144: "A nursery with a crib, a rocking chair, a changing table, a baby mobile hanging from the ceiling, and a pile of wooden play blocks on the floor.",
  157: "A dining room with a table set for 8 people. Each setting has a plate, a glass, a fork, and a knife.",
  158: "A dining room with a long table set for 12 people. Each setting has a small plate stacked on a large plate, a glass, a fork, and a knife.",
  164: "A pottery store with shelves along the walls. The shelves hold at least 30 cups and 30 bowls. There is a table with a large painted bowl.",
  167: "A kitchen with a three-level shelf. The top level holds at least 10 jars. The other two levels hold stacks of plates with at least 20 plates in total.",
  169: "A bedroom with a vanity table. On the table are at least 6 makeup bottles, at least 2 brushes, and a small mirror. There is also a nightstand with a stack of 8 books.",
  174: "A bookstore with at least 50 books.",
  175: "A Star Wars themed teen bedroom. The room features a bed with Star Wars bedding showing characters and starships, and a Star Wars themed desk lamp with Darth Vader or Death Star designs.",
  176: "A playroom inspired by The Incredibles movie. The room features an Incredibles themed rug with the superhero family logo and two Incredibles themed bean bags for seating.",
  177: "An Art Deco styled living room. The room features an Art Deco style sofa with geometric patterns, an Art Deco style coffee table positioned in front of the sofa, and an Art Deco style floor lamp with a geometric shade.",
  178: "A Minecraft themed gaming room. The room features a Minecraft themed chair with Creeper designs and a Minecraft themed poster on the wall.",
  180: "A steampunk styled home office. The room features a steampunk desk with brass fittings and exposed gears, a steampunk style desk lamp with copper pipes and vintage bulb, a steampunk themed wall clock with visible clockwork mechanisms, and a steampunk styled office chair with leather and metal accents.",
  183: "A Jurassic Park themed kids bedroom. The room features a bed with Jurassic Park dinosaur bedding, a Jurassic Park themed rug on the floor, and a Jurassic Park poster on the wall. Two dinosaur stuffed animals sit on the bed, and a dinosaur themed desk lamp rests on the nightstand.",
  184: "A Frozen themed nursery. The room features a Frozen themed crib with Elsa and Anna bedding, a Frozen themed rocking chair, a Frozen themed rug with snowflake patterns on the floor, a Frozen themed lamp on a side table, a Frozen poster on the wall, and a Frozen themed toy box for storage.",
  185: "A compact studio apartment with a single open-plan room and a bathroom. The studio contains a bed against the wall, a sofa, and a desk with a chair. The bathroom has a toilet, a sink, and a blue bathtub.",
  186: "A hotel room with a bedroom and an en-suite bathroom. The bedroom has a bed with two nightstands on each side, a desk with a chair, and a TV mounted on the wall. The bathroom has a toilet, a sink, and a shower.",
  187: "A one-bedroom apartment with a bedroom, a living room, and a bathroom. The bedroom has a bed and a wardrobe. The living room has a sofa, a coffee table, and a TV on a TV stand. The bathroom has a toilet, a sink, and a bathtub.",
  188: "A cozy guest cottage with a bedroom, a sitting area, and a bathroom. The bedroom has a bed with a nightstand and a lamp on top. The sitting area has two armchairs and a wooden bookshelf full of books. A skull sits on the bookshelf. The bathroom has a toilet and a sink.",
  189: "A small office suite with a reception, a private office, and a bathroom. The reception has a reception desk with a computer on it and two chairs. The private office has an office desk with a chair and a filing cabinet. The bathroom has a toilet and a sink.",
  190: "A massage parlor with a treatment room, a waiting area, and a bathroom. The treatment room has a massage table and a shelf with bottles. The waiting area has a sofa and a coffee table with books on it. The bathroom has a toilet and a sink.",
  191: "A tiny house with a bedroom, a living-kitchen, and a bathroom. The bedroom has a bed and a wooden dresser. The living-kitchen has a sofa, a dining table with two chairs, and a refrigerator. The bathroom has a toilet and a sink.",
  192: "A hair salon with a salon floor, a waiting area, a storage room, and a bathroom. The salon floor has two salon chairs positioned in front of two mirrors on the wall, facing them. The waiting area has a sofa and a coffee table. The storage room has shelves with bottles. The bathroom has a toilet and a sink.",
  193: "A dorm suite with a bedroom, a study room, a common_room, and a bathroom. The bedroom has a bed and a wardrobe. The study room has a desk with a chair and a bookshelf with books. The common_room has a refrigerator and a microwave on a counter. The bathroom has a toilet and a sink.",
  194: "A small retail shop with a showroom, a fitting room, a storage room, and a bathroom. The showroom has a display table with clothes on it and a cash register on a counter. The fitting room has a mirror and a bench. The storage room has shelves with boxes. The bathroom has a toilet and a sink.",
  195: "A two-bedroom apartment with a master bedroom, a second bedroom, a living room, a hallway, and a bathroom. The master bedroom has a bed and a nightstand. The second bedroom has a bed and a desk with a chair. The living room has a sofa, a coffee table, and a TV. The hallway has a coat rack. The bathroom has a toilet, a sink, and a bathtub.",
  196: "A boutique hotel suite with a bedroom, a living area, a walk-in closet, a dressing room, and a bathroom. The bedroom has a king-size bed with two nightstands. The living area has a sofa and a coffee table. The walk-in closet has a wardrobe and a luggage rack. The dressing room has a vanity with a mirror. The bathroom has a toilet, a sink, and a bathtub.",
  197: "A small restaurant with a dining area, a kitchen, a bar, a storage room, and a bathroom. The dining area has four dining tables, each with two chairs. The kitchen has a stove and a refrigerator. The bar has a bar counter with three bar stools. The storage room has shelves with supplies including plates and cups. The bathroom has a toilet and a sink.",
  198: "A small family home with a master bedroom, a kids room, a living-dining room, a kitchen, a hallway, and a bathroom. The master bedroom has a bed and a dresser. The kids room has a bunk bed and a toy box. The living-dining room has a sofa, a dining table with four chairs, and a TV. The kitchen has a refrigerator and a stove. The hallway has a coat rack and a shoe cabinet. The bathroom has a toilet, a sink, and a bathtub.",
  199: "A dental office with a reception-waiting area, two exam rooms, an X-ray room, a corridor, and a bathroom. The reception-waiting area has a reception desk with a computer and three chairs. The first exam room has a dental chair and a cabinet. The second exam room has a dental chair and a sink. The X-ray room has an X-ray machine. The corridor has a bench. The bathroom has a toilet and a sink.",
  200: "An art gallery with three exhibition rooms, an office, a storage room, and a bathroom. The first exhibition room has two paintings on the wall and a bench. The second exhibition room has three sculptures on pedestals. The third exhibition room has a painting on the wall with a bench in front for viewing. The office has a desk with a chair and a computer. The storage room has shelves with crates. The bathroom has a toilet and a sink.",
  201: "A co-working space with an open office, two meeting rooms, a lounge, a kitchen, a reception, and a bathroom. The open office has four desks with chairs and computers. The first meeting room has a conference table with six chairs. The second meeting room has a whiteboard and four chairs. The lounge has two sofas and a coffee table. The kitchen has a refrigerator and a microwave on a counter. The reception has a reception desk with a computer. The bathroom has a toilet and a sink.",
  202: "A photography studio with a shooting area, an editing room, a client lounge, a dressing room, a props storage, an office, and a bathroom. The shooting area has two studio lights and a backdrop. The editing room has a desk with two monitors and a chair. The client lounge has a sofa and a coffee table. The dressing room has a vanity with a mirror on top and a clothing rack. The props storage has shelves with props including hats and bags. The office has a desk with a chair and a filing cabinet. The bathroom has a toilet and a sink.",
  203: "A small fitness studio with a workout area, a yoga room, a locker room, a reception, an office, a storage room, and a bathroom. The workout area has a treadmill, a weight rack with dumbbells, and a squat rack with a stack of weight plates next to it. The yoga room has yoga mats and a mirror on the wall. The locker room has lockers and a bench. The reception has a reception desk with a computer. The office has a desk with a chair. The storage room has shelves with towels. The bathroom has a toilet and a sink.",
  204: "A pet clinic with a reception, a waiting room, two exam rooms, a surgery room, a corridor, and a bathroom. The reception has a reception desk with a computer. The waiting room has four chairs and a water dispenser. The first exam room has an exam table and a cabinet. The second exam room has an exam table and a scale. The surgery room has a surgery table and a surgical light. The corridor has a bench. The bathroom has a toilet and a sink.",
  205: "A large family home with a master bedroom, two kids bedrooms, a living room, a kitchen, a dining room, a hallway, and two bathrooms. The master bedroom has a bed with two nightstands and a dresser. The first kids bedroom has a bed and a desk with a chair. The second kids bedroom has a bunk bed and a bookshelf with books. The living room has a sofa, a coffee table, and a TV. The kitchen has a refrigerator, a stove, and a dining table with four chairs. The dining room has a dining table with six chairs and a sideboard. The hallway has a coat rack and a mirror on the wall. The first bathroom has a toilet, a sink, and a bathtub. The second bathroom has a toilet and a sink.",
  206: "A medical clinic with a reception, a waiting room, four exam rooms, a lab, a pharmacy, a corridor, and two bathrooms. The reception has a reception desk with a computer. The waiting room has six chairs and a water dispenser. The first exam room has an exam table and a cabinet. The second exam room has an exam table and a scale. The third exam room has an exam table and a desk with a chair. The fourth exam room has an exam table and a stool. The lab has a lab bench and a microscope. The pharmacy has shelves with bottles. The corridor has a bench. The first bathroom has a toilet and a sink. The second bathroom has a toilet and a sink.",
  207: "A small office building with a reception, five offices, two conference rooms, a break room, a server room, a corridor, and a bathroom. The reception has a reception desk with a computer and two chairs. The first office has a desk with a chair and a computer. The second office has a desk with a chair and a filing cabinet. The third office has a desk with a chair and a bookshelf. The fourth office has a desk with a chair and a printer. The fifth office has a desk with a chair and a whiteboard. The first conference room has a conference table with eight chairs. The second conference room has a conference table with six chairs, a projector, and a whiteboard on the wall. The break room has a refrigerator, a microwave on a counter, and a table with four chairs. The server room has two server racks. The corridor has a water dispenser. The bathroom has a toilet and a sink.",
  208: "A community center with a main hall, four activity rooms, a kitchen, an office, a reception, a locker room, a hallway, two bathrooms, and a storage room. The main hall has a stage and rows of chairs. The first activity room has tables and chairs for crafts. The second activity room has yoga mats and a mirror on the wall. The third activity room has a ping pong table. The fourth activity room has easels and stools for art class. The kitchen has a refrigerator, a stove, and a counter. The office has a desk with a chair and a computer. The reception has a desk with a computer. The locker room has lockers and a bench. The hallway has a bulletin board on the wall. The first bathroom has a toilet and a sink. The second bathroom has a toilet and a sink. The storage room has shelves with boxes.",
  209: "A boutique hotel with a reception, four guest bedrooms with en-suite bathrooms, a restaurant, a kitchen, a gym, a lounge, and a corridor. The reception has a desk with a computer and two armchairs. The first guest bedroom has a bed with two nightstands and its bathroom has a toilet, a sink, and a shower. The second guest bedroom has a bed and a desk and its bathroom has a toilet, a sink, and a bathtub. The third guest bedroom has a bed and an armchair and its bathroom has a toilet, a sink, and a shower. The fourth guest bedroom has a bed and a wardrobe and its bathroom has a toilet, a sink, and a bathtub. The restaurant has four dining tables with chairs. The kitchen has a refrigerator, a stove, and a counter. The gym has a treadmill and a weight rack with dumbbells. The lounge has two sofas and a coffee table. The corridor has a console table with a vase on top."
};

// Seeded random shuffle for consistent ordering
function seededShuffle(array, seed) {
  const result = [...array];
  let m = result.length;
  while (m) {
    const i = Math.floor(mulberry32(seed)() * m--);
    [result[m], result[i]] = [result[i], result[m]];
    seed++;
  }
  return result;
}

function mulberry32(a) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// Build room scenes array: featured first, then randomized remaining
function buildRoomScenes() {
  const scenes = [];

  // Add featured scenes first (in order)
  for (const id of FEATURED_ROOM_IDS) {
    if (ROOM_IDS.includes(id)) {
      scenes.push({
        id,
        prompt: PROMPTS[id],
        path: `room/scene_${id}/scene_named.glb`,
        featured: true
      });
    }
  }

  // Get remaining room IDs and shuffle
  const remainingIds = ROOM_IDS.filter(id => !FEATURED_ROOM_IDS.includes(id));
  const shuffled = seededShuffle(remainingIds, 42);

  // Add remaining scenes
  for (const id of shuffled) {
    scenes.push({
      id,
      prompt: PROMPTS[id],
      path: `room/scene_${id}/scene_named.glb`,
      featured: false
    });
  }

  return scenes;
}

// Build house scenes array: featured first, then randomized remaining
function buildHouseScenes() {
  const scenes = [];

  // Add featured scenes first (in order)
  for (const id of FEATURED_HOUSE_IDS) {
    if (HOUSE_IDS.includes(id)) {
      scenes.push({
        id,
        prompt: PROMPTS[id],
        path: `house/scene_${id}/scene_named.glb`,
        featured: true
      });
    }
  }

  // Get remaining house IDs (keep original order)
  const remainingIds = HOUSE_IDS.filter(id => !FEATURED_HOUSE_IDS.includes(id));

  // Add remaining scenes
  for (const id of remainingIds) {
    scenes.push({
      id,
      prompt: PROMPTS[id],
      path: `house/scene_${id}/scene_named.glb`,
      featured: false
    });
  }

  return scenes;
}

export const SCENES = {
  rooms: buildRoomScenes(),
  houses: buildHouseScenes()
};

// Helper to get a scene by ID
export function getSceneById(id, type = 'rooms') {
  const scenes = type === 'rooms' ? SCENES.rooms : SCENES.houses;
  return scenes.find(s => s.id === id);
}

// Helper to search scenes by keyword
export function searchScenes(query, type = 'rooms') {
  const scenes = type === 'rooms' ? SCENES.rooms : SCENES.houses;
  const lowerQuery = query.toLowerCase();
  return scenes.filter(s => s.prompt.toLowerCase().includes(lowerQuery));
}
