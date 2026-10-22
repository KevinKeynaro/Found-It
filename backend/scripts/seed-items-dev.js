import zlib from 'zlib';
import 'dotenv/config';
import pool from '../src/config/db.js';
import cloudinary from '../src/config/cloudinary.js';

if (process.env.NODE_ENV === 'production') {
  console.error('Error: Seed scripts cannot run in production environment.');
  process.exit(1);
}

const isClean = process.argv.includes('clean') || process.argv[2] === 'clean';

function createCRC32Table() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c >>> 0;
  }
  return table;
}

const crcTable = createCRC32Table();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData), 0);
  return Buffer.concat([len, typeAndData, crc]);
}

function generateSolidPng(width, height, r, g, b) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2; // RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const ihdrChunk = makeChunk('IHDR', ihdr);

  const rowSize = 1 + width * 3;
  const rawData = Buffer.alloc(height * rowSize);
  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0;
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 3;
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
    }
  }

  const idatData = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', idatData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function uploadBufferToCloudinary(buffer, publicId) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        public_id: publicId,
        resource_type: 'image',
        overwrite: true,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(buffer);
  });
}

function getPastDate(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

function getPastTimestamp(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d;
}

const PALETTE = [
  [30, 64, 175],   // blue
  [5, 150, 105],   // green
  [217, 119, 6],   // amber
  [220, 38, 38],   // red
  [124, 58, 237],  // purple
  [14, 116, 144],  // cyan
  [234, 88, 12],   // orange
  [75, 85, 99],    // slate
];

async function runClean() {
  try {
    const [rows] = await pool.query(
      "SELECT id, image_public_id FROM items WHERE image_public_id LIKE 'found-it/dev-seed/%'"
    );

    const publicIds = rows.map((r) => r.image_public_id).filter(Boolean);

    let imagesDestroyed = 0;
    if (publicIds.length > 0) {
      try {
        const delRes = await cloudinary.api.delete_resources(publicIds);
        imagesDestroyed = Object.keys(delRes.deleted || {}).length;
      } catch (err) {
        // Fall back to deleting individually if batch fails
        for (const pid of publicIds) {
          try {
            await cloudinary.uploader.destroy(pid);
            imagesDestroyed++;
          } catch {
            // ignore individual error
          }
        }
      }
    }

    try {
      await cloudinary.api.delete_folder('found-it/dev-seed');
    } catch {
      // folder might not be empty or exist
    }

    const [delResult] = await pool.query(
      "DELETE FROM items WHERE image_public_id LIKE 'found-it/dev-seed/%'"
    );

    console.log(
      `Clean complete: deleted ${delResult.affectedRows} items from database and ${imagesDestroyed} images from Cloudinary.`
    );
  } finally {
    await pool.end();
  }
}

async function runSeed() {
  try {
    const [teacherRows] = await pool.query(
      "SELECT id FROM users WHERE email = 'teacher@found-it.test'"
    );
    if (teacherRows.length === 0) {
      console.error(
        "Error: Required seed user 'teacher@found-it.test' not found. Run 'npm run seed:dev' first."
      );
      process.exit(1);
    }
    const teacherId = teacherRows[0].id;

    const [studentRows] = await pool.query(
      "SELECT id FROM users WHERE email = 'student@found-it.test'"
    );
    if (studentRows.length === 0) {
      console.error(
        "Error: Required seed user 'student@found-it.test' not found. Run 'npm run seed:dev' first."
      );
      process.exit(1);
    }

    // Clean existing seed items first to avoid orphaned duplicates
    const [existing] = await pool.query(
      "SELECT image_public_id FROM items WHERE image_public_id LIKE 'found-it/dev-seed/%'"
    );
    if (existing.length > 0) {
      const pids = existing.map((r) => r.image_public_id).filter(Boolean);
      try {
        await cloudinary.api.delete_resources(pids);
      } catch {
        // ignore
      }
      await pool.query("DELETE FROM items WHERE image_public_id LIKE 'found-it/dev-seed/%'");
    }

    const itemsToCreate = [
      // 16 Active items (within last 20 days)
      {
        title: 'Blue Hydro Flask with Stickers',
        description: 'Dark blue water bottle covered in science club and nature stickers. Has a small dent on the bottom rim.',
        location_found: 'Sports Hall Bench',
        date_found: getPastDate(1),
        status: 'found',
      },
      {
        title: 'Casio Scientific Calculator fx-991EX',
        description: 'Black calculator with a white sliding cover. Left on a desk after 3rd period math class.',
        location_found: 'Room 302 (Math Lab)',
        date_found: getPastDate(2),
        status: 'found',
      },
      {
        title: 'Extremely Long Lost Item Title Demonstrating Two-Line Text Clamping In Responsive Grid Cards Without Layout Shift or Breaking Mobile Design',
        description: 'Testing how very long titles wrap across two lines with proper ellipsis in card views.',
        location_found: 'Main Library 2nd Floor',
        date_found: getPastDate(3),
        status: 'found',
      },
      {
        title: 'Black Umbro Sports Jacket (Size M)',
        description: null, // item with no description
        location_found: 'Football Field Bleachers',
        date_found: getPastDate(4),
        status: 'found',
      },
      {
        title: 'Detailed Art Portfolio with Sketches',
        description:
          'A thick black A3 leather binder with a gold zipper containing several pencil drawings, acrylic paintings on canvas paper, and anatomy studies.\n\nPlease visit the art room staff to identify specific sketches and reclaim.', // long description with line breaks
        location_found: 'Art Studio B',
        date_found: getPastDate(5),
        status: 'found',
      },
      {
        title: 'Notebook_blue 50% full', // literal % and _ characters
        description: 'Spiral notebook with blue polypropylene cover and chemistry revision notes inside.',
        location_found: 'Chemistry Laboratory 1',
        date_found: getPastDate(6),
        status: 'found',
      },
      {
        title: 'Sony Wireless Headphones (Black WH-CH520)',
        description: 'Black on-ear headphones with minor scuffs on the right ear cup. Found on the window sill.',
        location_found: 'Computer Lab 3',
        date_found: getPastDate(7),
        status: 'found',
      },
      {
        title: 'Red Pencil Case with Animal Keychain',
        description: 'Fabric zip pouch containing Faber-Castell coloring pencils and a green frog keychain.',
        location_found: 'Classroom 10-A',
        date_found: getPastDate(8),
        status: 'found',
      },
      {
        title: 'Gray North Face Backpack',
        description: 'Backpack with padded shoulder straps. Contains textbooks for 11th grade literature.',
        location_found: 'Cafeteria Table 14',
        date_found: getPastDate(9),
        status: 'found',
      },
      {
        title: 'Reading Glasses with Tortoiseshell Frame',
        description: 'Oval spectacles stored in a brown magnetic hard case.',
        location_found: 'Teachers Lounge Corridor',
        date_found: getPastDate(11),
        status: 'found',
      },
      {
        title: 'Stainless Steel Travel Mug',
        description: 'Silver thermos with black sip lid. Still had tea in it when found.',
        location_found: 'Biology Garden Gazebo',
        date_found: getPastDate(12),
        status: 'found',
      },
      {
        title: 'Set of Locker Keys with Brass Tag',
        description: 'Two brass keys attached to a yellow plastic number tag (#42).',
        location_found: 'East Wing Locker Bay',
        date_found: getPastDate(14),
        status: 'found',
      },
      {
        title: 'Nike Black Gym Bag with Towel',
        description: 'Compact duffel bag found under the indoor basketball bleachers.',
        location_found: 'Gymnasium Locker Room',
        date_found: getPastDate(15),
        status: 'found',
      },
      {
        title: 'Wireless Computer Mouse (Logitech M185)',
        description: 'Compact optical mouse with USB nano receiver stored in battery compartment.',
        location_found: 'Library Computer Terminal 8',
        date_found: getPastDate(17),
        status: 'found',
      },
      {
        title: 'Green Umbrella with Wooden Handle',
        description: 'Long stick umbrella with dark green canopy and curved wooden grip.',
        location_found: 'Main Entrance Stand',
        date_found: getPastDate(18),
        status: 'found',
      },
      {
        title: 'English-Indonesian Oxford Dictionary',
        description: 'Hardcover pocket dictionary with sticky index tabs on vocabulary pages.',
        location_found: 'Language Room 204',
        date_found: getPastDate(19),
        status: 'found',
      },

      // 3 Overdue items (40 to 60 days ago)
      {
        title: 'Silver Digital Wristwatch (Casio Vintage)',
        description: 'Stainless steel band vintage digital watch with alarm function.',
        location_found: 'Swimming Pool Viewing Gallery',
        date_found: getPastDate(42),
        status: 'found',
      },
      {
        title: 'Yellow Raincoat with Reflective Stripes',
        description: 'Foldable hooded raincoat left during the rainy season sports meet.',
        location_found: 'Track & Field Shed',
        date_found: getPastDate(48),
        status: 'found',
      },
      {
        title: 'Wooden Acoustic Guitar Capo',
        description: 'Quick-change spring capo for 6-string acoustic guitars.',
        location_found: 'Music Practice Room 2',
        date_found: getPastDate(55),
        status: 'found',
      },

      // 3 Returned items
      {
        title: 'Kindle Paperwhite E-Reader in Blue Case',
        description: 'Electronic reader with matte screen and magnetic leather flip cover.',
        location_found: 'Senior Study Lounge',
        date_found: getPastDate(10),
        status: 'returned',
        returned_at: getPastTimestamp(2), // within retention window
        returned_by: teacherId,
        returned_to: 'Sarah Jenkins (12-IPA-1)',
      },
      {
        title: 'Apple AirPods 3rd Gen Charging Case',
        description: 'White wireless earbud case with initial sticker "A.K." on back.',
        location_found: 'Auditorium Row F',
        date_found: getPastDate(8),
        status: 'returned',
        returned_at: getPastTimestamp(1), // within retention window
        returned_by: teacherId,
        returned_to: 'Alex Kusuma',
      },
      {
        title: 'Black Leather Wallet with Student ID',
        description: 'Bi-fold leather wallet with school library barcode card inside.',
        location_found: 'Campus Bus Stop',
        date_found: getPastDate(30),
        status: 'returned',
        returned_at: getPastTimestamp(14), // older than 5-day retention window
        returned_by: teacherId,
        returned_to: 'David Hartono',
      },

      // 1 Soft-deleted item (deleted_at and deleted_by set)
      {
        title: 'Duplicate Test Entry To Be Ignored',
        description: 'Accidental duplicate entry posted by mistake.',
        location_found: 'Administration Office',
        date_found: getPastDate(3),
        status: 'found',
        deleted_at: getPastTimestamp(1),
        deleted_by: teacherId,
      },
    ];

    let createdCount = 0;

    for (let i = 0; i < itemsToCreate.length; i++) {
      const item = itemsToCreate[i];
      const color = PALETTE[i % PALETTE.length];
      const pngBuffer = generateSolidPng(800, 600, color[0], color[1], color[2]);
      const publicId = `found-it/dev-seed/item-${Date.now()}-${i + 1}`;

      const uploadResult = await uploadBufferToCloudinary(pngBuffer, publicId);

      await pool.query(
        `INSERT INTO items (
          title, description, location_found, date_found,
          image_url, image_public_id, status, posted_by,
          returned_at, returned_by, returned_to,
          deleted_at, deleted_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.title,
          item.description || null,
          item.location_found,
          item.date_found,
          uploadResult.secure_url,
          uploadResult.public_id,
          item.status,
          teacherId,
          item.returned_at || null,
          item.returned_by || null,
          item.returned_to || null,
          item.deleted_at || null,
          item.deleted_by || null,
        ]
      );

      createdCount++;
    }

    console.log(`Seed complete: created ${createdCount} dev items.`);
  } finally {
    await pool.end();
  }
}

if (isClean) {
  runClean().catch((err) => {
    console.error('Clean error:', err.message || err);
    process.exit(1);
  });
} else {
  runSeed().catch((err) => {
    console.error('Seed error:', err.message || err);
    process.exit(1);
  });
}
