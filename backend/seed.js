const pool = require('./db');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

function requireDemoPassword() {
  const password = process.env.DEMO_PASSWORD || process.env.SEED_DEMO_PASSWORD || process.env.DEMO_SEED_PASSWORD || '';
  if (password.length < 12 || password.length > 1024) throw new Error('DEMO_PASSWORD must contain 12-1024 characters');
  return password;
}

async function seed() {
  const client = await pool.connect();
  try {
    console.log('Starting database seed...');

    // Drop all tables
    await client.query(`
      DROP TABLE IF EXISTS cip_schedules CASCADE;
      DROP TABLE IF EXISTS fermentation_logs CASCADE;
      DROP TABLE IF EXISTS lab_results CASCADE;
      DROP TABLE IF EXISTS packaging_runs CASCADE;
      DROP TABLE IF EXISTS pos_transactions CASCADE;
      DROP TABLE IF EXISTS distributions CASCADE;
      DROP TABLE IF EXISTS kegs CASCADE;
      DROP TABLE IF EXISTS financial_records CASCADE;
      DROP TABLE IF EXISTS events CASCADE;
      DROP TABLE IF EXISTS loyalty_members CASCADE;
      DROP TABLE IF EXISTS vendors CASCADE;
      DROP TABLE IF EXISTS equipment CASCADE;
      DROP TABLE IF EXISTS raw_materials CASCADE;
      DROP TABLE IF EXISTS tanks CASCADE;
      DROP TABLE IF EXISTS brew_logs CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
    `);
    console.log('Dropped all tables.');

    // Create users table
    await client.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create brew_logs table
    await client.query(`
      CREATE TABLE brew_logs (
        id SERIAL PRIMARY KEY,
        batch_id VARCHAR(50),
        recipe_name VARCHAR(255) NOT NULL,
        style VARCHAR(255),
        brew_date DATE,
        brewer VARCHAR(255),
        grain_bill TEXT,
        hops TEXT,
        yeast VARCHAR(255),
        mash_temp DECIMAL(5,1),
        og DECIMAL(5,3),
        fg DECIMAL(5,3),
        abv DECIMAL(4,1),
        ibu DECIMAL(5,1),
        volume_gallons DECIMAL(10,2),
        status VARCHAR(50) DEFAULT 'planning',
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create tanks table
    await client.query(`
      CREATE TABLE tanks (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        type VARCHAR(50),
        capacity_gallons DECIMAL(10,2),
        status VARCHAR(50) DEFAULT 'available',
        current_batch VARCHAR(100),
        temperature DECIMAL(5,1),
        pressure_psi DECIMAL(5,2),
        location VARCHAR(255),
        notes TEXT
      );
    `);

    // Create raw_materials table
    await client.query(`
      CREATE TABLE raw_materials (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(50),
        quantity DECIMAL(10,2),
        unit VARCHAR(50),
        supplier VARCHAR(255),
        lot_number VARCHAR(100),
        cost_per_unit DECIMAL(10,2),
        reorder_point DECIMAL(10,2),
        expiration_date DATE,
        status VARCHAR(50) DEFAULT 'in-stock',
        storage_location VARCHAR(255),
        notes TEXT
      );
    `);

    // Create fermentation_logs table
    await client.query(`
      CREATE TABLE fermentation_logs (
        id SERIAL PRIMARY KEY,
        batch_id INTEGER,
        tank_id INTEGER,
        date DATE,
        time TIME,
        temperature DECIMAL(5,1),
        gravity DECIMAL(5,3),
        ph DECIMAL(4,2),
        dissolved_oxygen DECIMAL(6,2),
        pressure_psi DECIMAL(5,2),
        status VARCHAR(50) DEFAULT 'active',
        notes TEXT
      );
    `);

    // Create packaging_runs table
    await client.query(`
      CREATE TABLE packaging_runs (
        id SERIAL PRIMARY KEY,
        batch_id INTEGER,
        package_type VARCHAR(50),
        quantity INTEGER,
        date DATE,
        line VARCHAR(50),
        operator VARCHAR(255),
        fill_level DECIMAL(6,2),
        co2_volumes DECIMAL(4,2),
        do_level DECIMAL(6,2),
        status VARCHAR(50) DEFAULT 'scheduled',
        notes TEXT
      );
    `);

    // Create kegs table
    await client.query(`
      CREATE TABLE kegs (
        id SERIAL PRIMARY KEY,
        keg_id VARCHAR(50) NOT NULL,
        beer_name VARCHAR(255),
        batch_id INTEGER,
        size VARCHAR(50),
        fill_date DATE,
        status VARCHAR(50) DEFAULT 'empty',
        location VARCHAR(255),
        distributor VARCHAR(255),
        notes TEXT
      );
    `);

    // Create pos_transactions table
    await client.query(`
      CREATE TABLE pos_transactions (
        id SERIAL PRIMARY KEY,
        transaction_id VARCHAR(50),
        date DATE,
        time TIME,
        items JSONB,
        subtotal DECIMAL(10,2),
        tax DECIMAL(10,2),
        tip DECIMAL(10,2),
        total DECIMAL(10,2),
        payment_method VARCHAR(50),
        server VARCHAR(255),
        customer_name VARCHAR(255),
        notes TEXT
      );
    `);

    // Create distributions table
    await client.query(`
      CREATE TABLE distributions (
        id SERIAL PRIMARY KEY,
        distributor VARCHAR(255),
        order_date DATE,
        delivery_date DATE,
        product VARCHAR(255),
        quantity INTEGER,
        unit_price DECIMAL(10,2),
        total DECIMAL(10,2),
        region VARCHAR(255),
        status VARCHAR(50) DEFAULT 'pending',
        tracking_number VARCHAR(100),
        notes TEXT
      );
    `);

    // Create lab_results table
    await client.query(`
      CREATE TABLE lab_results (
        id SERIAL PRIMARY KEY,
        batch_id INTEGER,
        test_type VARCHAR(100),
        date DATE,
        result VARCHAR(255),
        unit VARCHAR(50),
        expected_range VARCHAR(100),
        status VARCHAR(50) DEFAULT 'pending',
        technician VARCHAR(255),
        equipment_used VARCHAR(255),
        notes TEXT
      );
    `);

    // Create equipment table
    await client.query(`
      CREATE TABLE equipment (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(100),
        manufacturer VARCHAR(255),
        model VARCHAR(255),
        serial_number VARCHAR(100),
        purchase_date DATE,
        last_maintenance DATE,
        next_maintenance DATE,
        status VARCHAR(50) DEFAULT 'operational',
        location VARCHAR(255),
        notes TEXT
      );
    `);

    // Create events table
    await client.query(`
      CREATE TABLE events (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        type VARCHAR(50),
        date DATE,
        start_time TIME,
        end_time TIME,
        capacity INTEGER,
        tickets_sold INTEGER DEFAULT 0,
        ticket_price DECIMAL(10,2),
        description TEXT,
        status VARCHAR(50) DEFAULT 'planned',
        notes TEXT
      );
    `);

    // Create loyalty_members table
    await client.query(`
      CREATE TABLE loyalty_members (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(50),
        tier VARCHAR(50) DEFAULT 'bronze',
        points INTEGER DEFAULT 0,
        join_date DATE,
        visits INTEGER DEFAULT 0,
        total_spent DECIMAL(10,2) DEFAULT 0,
        birthday DATE,
        favorite_beer VARCHAR(255),
        status VARCHAR(50) DEFAULT 'active',
        notes TEXT
      );
    `);

    // Create financial_records table
    await client.query(`
      CREATE TABLE financial_records (
        id SERIAL PRIMARY KEY,
        date DATE,
        type VARCHAR(20),
        category VARCHAR(50),
        amount DECIMAL(12,2),
        description TEXT,
        reference_number VARCHAR(100),
        vendor VARCHAR(255),
        payment_method VARCHAR(50),
        status VARCHAR(50) DEFAULT 'pending',
        notes TEXT
      );
    `);

    // Create cip_schedules table
    await client.query(`
      CREATE TABLE cip_schedules (
        id SERIAL PRIMARY KEY,
        equipment VARCHAR(255),
        scheduled_date DATE,
        completed_date DATE,
        cip_type VARCHAR(50),
        chemical_concentration VARCHAR(100),
        temperature DECIMAL(5,1),
        duration_minutes INTEGER,
        operator VARCHAR(255),
        status VARCHAR(50) DEFAULT 'scheduled',
        verification VARCHAR(255),
        notes TEXT
      );
    `);

    // Create vendors table
    await client.query(`
      CREATE TABLE vendors (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        category VARCHAR(50),
        contact_name VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(50),
        address TEXT,
        website VARCHAR(255),
        payment_terms VARCHAR(100),
        lead_time_days INTEGER,
        rating DECIMAL(3,1),
        status VARCHAR(50) DEFAULT 'active',
        notes TEXT
      );
    `);

    console.log('All tables created.');

    // =========== SEED DATA ===========

    // Users
    const hashedPassword = await bcrypt.hash(requireDemoPassword(), 10);
    await client.query(`
      INSERT INTO users (name, email, password) VALUES
      ('Admin User', 'admin@brewery.com', '${hashedPassword}'),
      ('Head Brewer', 'brewer@brewery.com', '${hashedPassword}'),
      ('Taproom Manager', 'taproom@brewery.com', '${hashedPassword}');
    `);

    // Brew Logs
    await client.query(`
      INSERT INTO brew_logs (batch_id, recipe_name, style, brew_date, brewer, grain_bill, hops, yeast, mash_temp, og, fg, abv, ibu, volume_gallons, status, notes) VALUES
      ('BL-2026-001', 'Hoppy Trails IPA', 'IPA', '2026-01-05', 'Mike Chen', '12lb Pale Malt, 1lb Crystal 40', 'Citra, Mosaic, Simcoe', 'US-05', 152, 1.065, 1.012, 6.9, 65, 310, 'completed', 'Dry hopped for 5 days'),
      ('BL-2026-002', 'Golden Sunrise Lager', 'Pilsner', '2026-01-10', 'Sarah Kim', '10lb Pilsner Malt, 0.5lb Carapils', 'Saaz, Hallertau', 'W-34/70', 148, 1.048, 1.008, 5.2, 30, 620, 'completed', 'Lagered for 4 weeks'),
      ('BL-2026-003', 'Midnight Porter', 'Porter', '2026-01-15', 'Mike Chen', '10lb Pale Malt, 2lb Chocolate Malt, 1lb Crystal 80', 'Fuggle, East Kent Goldings', 'S-04', 154, 1.058, 1.014, 5.7, 35, 310, 'fermenting', 'Added cocoa nibs at secondary'),
      ('BL-2026-004', 'Citrus Wheat', 'Wheat Beer', '2026-01-20', 'Emily Torres', '6lb Wheat Malt, 5lb Pale Malt', 'Cascade, Amarillo', 'WB-06', 150, 1.050, 1.010, 5.2, 18, 310, 'completed', 'Added orange peel and coriander'),
      ('BL-2026-005', 'Barrel Aged Stout', 'Imperial Stout', '2026-01-25', 'Mike Chen', '14lb Pale Malt, 3lb Roasted Barley, 2lb Chocolate', 'Magnum, Willamette', 'US-05', 156, 1.095, 1.022, 9.5, 55, 155, 'conditioning', 'Aging in bourbon barrels'),
      ('BL-2026-006', 'Summer Shandy', 'Radler', '2026-02-01', 'Sarah Kim', '8lb Pilsner Malt, 1lb Munich', 'Tettnang', 'W-34/70', 148, 1.042, 1.006, 4.7, 12, 620, 'completed', 'Blended with lemonade'),
      ('BL-2026-007', 'Hazy Daze NEIPA', 'New England IPA', '2026-02-05', 'Emily Torres', '11lb Pale Malt, 2lb Flaked Oats, 1lb Wheat', 'Galaxy, El Dorado, Citra', 'London Ale III', 150, 1.070, 1.015, 7.2, 45, 310, 'fermenting', 'Heavy biotransformation hop schedule'),
      ('BL-2026-008', 'Red Rye Ale', 'Amber Ale', '2026-02-10', 'Mike Chen', '9lb Pale Malt, 2lb Rye Malt, 1lb Crystal 60', 'Centennial, Cascade', 'US-05', 152, 1.055, 1.012, 5.6, 40, 310, 'completed', 'Nice spicy rye character'),
      ('BL-2026-009', 'Belgian Tripel', 'Tripel', '2026-02-15', 'Sarah Kim', '13lb Pilsner Malt, 2lb Candi Sugar', 'Styrian Goldings', 'Belgian Abbey', 148, 1.082, 1.010, 9.4, 28, 310, 'conditioning', 'Bottle conditioning for 3 weeks'),
      ('BL-2026-010', 'Session Pale Ale', 'Pale Ale', '2026-02-20', 'Emily Torres', '7lb Pale Malt, 0.5lb Crystal 20', 'Centennial, Amarillo', 'US-05', 150, 1.040, 1.008, 4.2, 35, 620, 'completed', 'Light and easy drinking'),
      ('BL-2026-011', 'Oatmeal Stout', 'Stout', '2026-02-25', 'Mike Chen', '10lb Pale Malt, 2lb Flaked Oats, 1.5lb Roasted Barley', 'Fuggle, Willamette', 'S-04', 154, 1.060, 1.016, 5.7, 30, 310, 'fermenting', 'Smooth and creamy'),
      ('BL-2026-012', 'Gose Gone Wild', 'Gose', '2026-03-01', 'Sarah Kim', '5lb Pilsner Malt, 5lb Wheat Malt', 'Hallertau', 'US-05', 148, 1.044, 1.006, 4.9, 10, 310, 'planning', 'Adding sea salt and coriander'),
      ('BL-2026-013', 'Double IPA', 'Double IPA', '2026-03-05', 'Emily Torres', '15lb Pale Malt, 1lb Crystal 40, 1lb Munich', 'Simcoe, Amarillo, Centennial', 'US-05', 152, 1.085, 1.014, 9.3, 85, 310, 'planning', 'Big hop bomb'),
      ('BL-2026-014', 'Kolsch Style', 'Kolsch', '2026-03-10', 'Mike Chen', '9lb Pilsner Malt, 1lb Vienna Malt', 'Hallertau, Tettnang', 'Kolsch Yeast', 148, 1.046, 1.008, 4.9, 22, 620, 'planning', 'Clean and crisp'),
      ('BL-2026-015', 'Saison Farmhouse', 'Saison', '2026-03-15', 'Sarah Kim', '10lb Pilsner Malt, 1lb Wheat, 0.5lb Rye', 'Styrian Goldings, Saaz', 'Belle Saison', 148, 1.058, 1.004, 7.0, 25, 310, 'planning', 'Peppery and dry finish');
    `);

    // Tanks
    await client.query(`
      INSERT INTO tanks (name, type, capacity_gallons, status, current_batch, temperature, pressure_psi, location, notes) VALUES
      ('FV-01', 'Fermenter', 400, 'in-use', 'BL-2026-003', 64.5, 12.0, 'Brewhouse A', 'Primary fermenter, glycol jacketed'),
      ('FV-02', 'Fermenter', 400, 'in-use', 'BL-2026-007', 66.0, 10.5, 'Brewhouse A', 'Primary fermenter, glycol jacketed'),
      ('FV-03', 'Fermenter', 400, 'available', NULL, NULL, NULL, 'Brewhouse A', 'Just cleaned, ready for use'),
      ('FV-04', 'Fermenter', 800, 'in-use', 'BL-2026-011', 62.0, 11.0, 'Brewhouse B', 'Large fermenter, dual glycol zones'),
      ('FV-05', 'Fermenter', 800, 'maintenance', NULL, NULL, NULL, 'Brewhouse B', 'Valve replacement needed'),
      ('BT-01', 'Brite Tank', 400, 'in-use', 'BL-2026-001', 34.0, 14.0, 'Packaging Hall', 'Carbonating for packaging'),
      ('BT-02', 'Brite Tank', 400, 'in-use', 'BL-2026-004', 33.5, 13.5, 'Packaging Hall', 'Ready for canning'),
      ('BT-03', 'Brite Tank', 800, 'available', NULL, NULL, NULL, 'Packaging Hall', 'Cleaned and sanitized'),
      ('HLT-01', 'Hot Liquor Tank', 600, 'available', NULL, 170.0, NULL, 'Brewhouse A', 'Maintains hot water supply'),
      ('MLT-01', 'Mash Lauter Tun', 500, 'available', NULL, NULL, NULL, 'Brewhouse A', 'Direct fire heated'),
      ('BK-01', 'Boil Kettle', 500, 'available', NULL, NULL, NULL, 'Brewhouse A', 'Steam jacketed, whirlpool arm'),
      ('CT-01', 'Conditioning Tank', 400, 'in-use', 'BL-2026-005', 38.0, 8.0, 'Cellar', 'Barrel aged stout conditioning'),
      ('CT-02', 'Conditioning Tank', 400, 'in-use', 'BL-2026-009', 42.0, 6.0, 'Cellar', 'Belgian Tripel bottle conditioning'),
      ('CT-03', 'Conditioning Tank', 200, 'available', NULL, NULL, NULL, 'Cellar', 'Small batch conditioning'),
      ('LT-01', 'Lagering Tank', 800, 'in-use', 'BL-2026-002', 33.0, 10.0, 'Cold Room', 'Extended lagering at low temp');
    `);

    // Raw Materials
    await client.query(`
      INSERT INTO raw_materials (name, category, quantity, unit, supplier, lot_number, cost_per_unit, reorder_point, expiration_date, status, storage_location, notes) VALUES
      ('Pale Malt 2-Row', 'Grain', 2500, 'lbs', 'Great Western Malting', 'GWM-2026-0142', 0.85, 500, '2026-12-15', 'in-stock', 'Grain Silo A', 'Base malt for most recipes'),
      ('Pilsner Malt', 'Grain', 1800, 'lbs', 'Weyermann', 'WEY-2026-0088', 1.10, 400, '2026-11-30', 'in-stock', 'Grain Silo B', 'German pilsner malt'),
      ('Crystal 40L', 'Grain', 300, 'lbs', 'Briess', 'BRI-2026-0055', 1.25, 100, '2027-03-01', 'in-stock', 'Specialty Grain Shelf 1', 'Caramel/crystal specialty malt'),
      ('Chocolate Malt', 'Grain', 150, 'lbs', 'Briess', 'BRI-2026-0056', 1.30, 50, '2027-02-15', 'in-stock', 'Specialty Grain Shelf 2', 'Dark roast character'),
      ('Wheat Malt', 'Grain', 600, 'lbs', 'Rahr & Sons', 'RAH-2026-0033', 0.90, 200, '2026-10-30', 'in-stock', 'Grain Silo C', 'For wheat beers and haze'),
      ('Citra Hops', 'Hops', 45, 'lbs', 'Yakima Chief', 'YCH-2026-CIT-01', 18.50, 15, '2027-06-01', 'in-stock', 'Hop Freezer A', 'T-90 pellets, 12% AA'),
      ('Mosaic Hops', 'Hops', 30, 'lbs', 'Yakima Chief', 'YCH-2026-MOS-01', 19.00, 10, '2027-06-01', 'in-stock', 'Hop Freezer A', 'T-90 pellets, 11.5% AA'),
      ('Cascade Hops', 'Hops', 55, 'lbs', 'Hop Union', 'HU-2026-CAS-02', 12.00, 20, '2027-05-15', 'in-stock', 'Hop Freezer A', 'Classic American hop'),
      ('Saaz Hops', 'Hops', 20, 'lbs', 'Hop Union', 'HU-2026-SAZ-01', 14.50, 10, '2027-05-15', 'in-stock', 'Hop Freezer B', 'Noble hop, Czech origin'),
      ('US-05 Yeast', 'Yeast', 40, 'packs', 'Fermentis', 'FER-2026-US05-12', 4.50, 15, '2026-08-30', 'in-stock', 'Yeast Fridge', 'American ale yeast, clean profile'),
      ('W-34/70 Yeast', 'Yeast', 25, 'packs', 'Fermentis', 'FER-2026-W34-08', 5.00, 10, '2026-09-15', 'in-stock', 'Yeast Fridge', 'German lager yeast'),
      ('S-04 Yeast', 'Yeast', 18, 'packs', 'Fermentis', 'FER-2026-S04-06', 4.50, 10, '2026-08-15', 'in-stock', 'Yeast Fridge', 'English ale yeast'),
      ('Irish Moss', 'Adjunct', 5, 'lbs', 'LD Carlson', 'LDC-2026-IM-01', 8.00, 2, '2027-12-01', 'in-stock', 'Adjunct Shelf', 'Kettle fining agent'),
      ('Gypsum', 'Water Treatment', 10, 'lbs', 'LD Carlson', 'LDC-2026-GYP-01', 3.50, 3, '2028-01-01', 'in-stock', 'Water Treatment Cabinet', 'Calcium sulfate for water adjustment'),
      ('Star San', 'Cleaning', 8, 'gallons', 'Five Star', 'FS-2026-SS-03', 22.00, 3, '2028-06-01', 'in-stock', 'Chemical Storage', 'No-rinse sanitizer');
    `);

    // Fermentation Logs
    await client.query(`
      INSERT INTO fermentation_logs (batch_id, tank_id, date, time, temperature, gravity, ph, dissolved_oxygen, pressure_psi, status, notes) VALUES
      (3, 1, '2026-01-16', '08:00', 64.5, 1.055, 4.35, 8.2, 12.0, 'active', 'Pitched yeast, aeration complete'),
      (3, 1, '2026-01-17', '08:00', 65.0, 1.048, 4.30, 5.1, 12.5, 'active', 'Active fermentation started'),
      (3, 1, '2026-01-18', '08:00', 66.5, 1.038, 4.22, 2.8, 13.0, 'active', 'Vigorous krausen formation'),
      (3, 1, '2026-01-19', '08:00', 66.0, 1.028, 4.18, 1.5, 12.5, 'active', 'Fermentation slowing slightly'),
      (3, 1, '2026-01-20', '08:00', 65.0, 1.020, 4.15, 0.8, 12.0, 'active', 'Nearing terminal gravity'),
      (7, 2, '2026-02-06', '08:00', 66.0, 1.068, 4.40, 9.0, 10.5, 'active', 'Pitched London Ale III'),
      (7, 2, '2026-02-07', '08:00', 67.0, 1.058, 4.32, 4.5, 11.0, 'active', 'Good activity, biotransformation hops added'),
      (7, 2, '2026-02-08', '08:00', 68.0, 1.042, 4.25, 2.2, 11.5, 'active', 'Heavy krausen, great aroma'),
      (7, 2, '2026-02-09', '08:00', 67.5, 1.030, 4.20, 1.0, 11.0, 'active', 'Slowing down, second dry hop'),
      (7, 2, '2026-02-10', '08:00', 67.0, 1.022, 4.16, 0.5, 10.5, 'active', 'Getting close to FG'),
      (11, 4, '2026-02-26', '08:00', 62.0, 1.058, 4.38, 8.5, 11.0, 'active', 'Pitched S-04 at lower temp'),
      (11, 4, '2026-02-27', '08:00', 63.0, 1.050, 4.30, 4.0, 11.5, 'active', 'Fermentation underway'),
      (11, 4, '2026-02-28', '08:00', 64.0, 1.040, 4.24, 2.0, 12.0, 'active', 'Strong fermentation'),
      (11, 4, '2026-03-01', '08:00', 63.5, 1.030, 4.18, 1.2, 11.5, 'active', 'Slowing gradually'),
      (11, 4, '2026-03-02', '08:00', 62.5, 1.022, 4.14, 0.6, 11.0, 'active', 'Near terminal gravity');
    `);

    // Packaging Runs
    await client.query(`
      INSERT INTO packaging_runs (batch_id, package_type, quantity, date, line, operator, fill_level, co2_volumes, do_level, status, notes) VALUES
      (1, 'Can 16oz', 960, '2026-01-28', 'Line A', 'Jake Wilson', 16.1, 2.55, 25, 'completed', 'Smooth run, minimal waste'),
      (1, 'Keg Half Barrel', 8, '2026-01-28', 'Line B', 'Tom Baker', 15.5, 2.50, 20, 'completed', 'All kegs filled and sealed'),
      (2, 'Can 12oz', 2400, '2026-02-14', 'Line A', 'Jake Wilson', 12.05, 2.65, 18, 'completed', '6-packs for retail distribution'),
      (2, 'Keg Half Barrel', 12, '2026-02-14', 'Line B', 'Tom Baker', 15.5, 2.60, 22, 'completed', 'Taproom and distribution kegs'),
      (4, 'Can 16oz', 960, '2026-02-10', 'Line A', 'Maria Lopez', 16.08, 2.50, 30, 'completed', 'Slight foam issue at start'),
      (4, 'Crowler 32oz', 120, '2026-02-10', 'Manual', 'Emily Torres', 32.0, 2.45, 35, 'completed', 'Taproom crowler fills'),
      (8, 'Can 16oz', 960, '2026-02-28', 'Line A', 'Jake Wilson', 16.12, 2.52, 22, 'completed', 'Clean run'),
      (8, 'Keg Sixth Barrel', 15, '2026-02-28', 'Line B', 'Tom Baker', 5.16, 2.48, 28, 'completed', 'For local restaurant accounts'),
      (10, 'Can 12oz', 2400, '2026-03-10', 'Line A', 'Maria Lopez', 12.02, 2.55, 20, 'scheduled', 'Large session pale run'),
      (10, 'Keg Half Barrel', 15, '2026-03-10', 'Line B', 'Tom Baker', 15.5, 2.52, 25, 'scheduled', 'Festival and taproom kegs'),
      (6, 'Can 12oz', 1800, '2026-03-01', 'Line A', 'Jake Wilson', 12.04, 2.60, 19, 'completed', 'Summer seasonal'),
      (6, 'Bottle 12oz', 600, '2026-03-01', 'Line C', 'Maria Lopez', 12.0, 2.58, 24, 'completed', 'Bottles for gift packs'),
      (3, 'Can 16oz', 960, '2026-03-15', 'Line A', 'Jake Wilson', 16.10, 2.50, 22, 'scheduled', 'Pending fermentation completion'),
      (7, 'Can 16oz', 960, '2026-03-18', 'Line A', 'Maria Lopez', 16.08, 2.48, 25, 'scheduled', 'Hazy IPA limited release'),
      (5, 'Bottle 22oz', 400, '2026-04-01', 'Line C', 'Emily Torres', 22.0, 2.20, 15, 'scheduled', 'Barrel aged special release');
    `);

    // Kegs
    await client.query(`
      INSERT INTO kegs (keg_id, beer_name, batch_id, size, fill_date, status, location, distributor, notes) VALUES
      ('KEG-001', 'Hoppy Trails IPA', 1, 'Half Barrel', '2026-01-28', 'filled', 'Taproom', NULL, 'On tap at bar position 1'),
      ('KEG-002', 'Hoppy Trails IPA', 1, 'Half Barrel', '2026-01-28', 'shipped', 'In Transit', 'Valley Distributing', 'Shipped to downtown accounts'),
      ('KEG-003', 'Golden Sunrise Lager', 2, 'Half Barrel', '2026-02-14', 'filled', 'Taproom', NULL, 'On tap at bar position 3'),
      ('KEG-004', 'Golden Sunrise Lager', 2, 'Half Barrel', '2026-02-14', 'shipped', 'In Transit', 'Mountain Beverage Co', 'Restaurant delivery'),
      ('KEG-005', 'Citrus Wheat', 4, 'Half Barrel', '2026-02-10', 'filled', 'Taproom', NULL, 'Seasonal tap'),
      ('KEG-006', 'Red Rye Ale', 8, 'Sixth Barrel', '2026-02-28', 'shipped', 'The Hop House', 'Direct Delivery', 'Local restaurant'),
      ('KEG-007', 'Red Rye Ale', 8, 'Sixth Barrel', '2026-02-28', 'shipped', 'Brew & Bite Cafe', 'Direct Delivery', 'Local restaurant'),
      ('KEG-008', 'Summer Shandy', 6, 'Half Barrel', '2026-03-01', 'filled', 'Cold Storage', NULL, 'Holding for summer launch'),
      ('KEG-009', NULL, NULL, 'Half Barrel', NULL, 'empty', 'Keg Wash Area', NULL, 'Cleaned, ready for fill'),
      ('KEG-010', NULL, NULL, 'Half Barrel', NULL, 'empty', 'Keg Wash Area', NULL, 'Cleaned, ready for fill'),
      ('KEG-011', NULL, NULL, 'Sixth Barrel', NULL, 'empty', 'Keg Storage', NULL, 'Minor dent, still usable'),
      ('KEG-012', 'Hoppy Trails IPA', 1, 'Half Barrel', '2026-01-28', 'returned', 'Keg Wash Area', 'Valley Distributing', 'Returned empty, needs cleaning'),
      ('KEG-013', NULL, NULL, 'Half Barrel', NULL, 'maintenance', 'Repair Shop', NULL, 'Spear valve replacement'),
      ('KEG-014', 'Golden Sunrise Lager', 2, 'Half Barrel', '2026-02-14', 'filled', 'Cold Storage', NULL, 'Reserve stock'),
      ('KEG-015', 'Hoppy Trails IPA', 1, 'Half Barrel', '2026-01-28', 'shipped', 'Craft Beer Market', 'Valley Distributing', 'Premium account');
    `);

    // POS Transactions
    await client.query(`
      INSERT INTO pos_transactions (transaction_id, date, time, items, subtotal, tax, tip, total, payment_method, server, customer_name, notes) VALUES
      ('TXN-20260320-001', '2026-03-20', '12:15', '[{"name":"Hoppy Trails IPA","qty":2,"price":7.00},{"name":"Pretzel Bites","qty":1,"price":9.00}]', 23.00, 1.84, 4.60, 29.44, 'credit', 'Lisa M', 'John Parker', NULL),
      ('TXN-20260320-002', '2026-03-20', '12:45', '[{"name":"Golden Sunrise Lager","qty":1,"price":6.50},{"name":"Fish Tacos","qty":1,"price":14.00}]', 20.50, 1.64, 4.10, 26.24, 'credit', 'Dave K', 'Sarah Mitchell', NULL),
      ('TXN-20260320-003', '2026-03-20', '13:30', '[{"name":"Flight Sampler","qty":1,"price":15.00}]', 15.00, 1.20, 3.00, 19.20, 'cash', 'Lisa M', NULL, 'Tourist group'),
      ('TXN-20260320-004', '2026-03-20', '14:00', '[{"name":"Citrus Wheat","qty":3,"price":6.50},{"name":"Burger","qty":2,"price":13.00}]', 45.50, 3.64, 9.10, 58.24, 'credit', 'Dave K', 'Mike & Amy Roberts', 'Birthday celebration'),
      ('TXN-20260320-005', '2026-03-20', '15:30', '[{"name":"Midnight Porter","qty":1,"price":7.50},{"name":"Red Rye Ale","qty":1,"price":7.00}]', 14.50, 1.16, 2.90, 18.56, 'debit', 'Lisa M', 'Chris Evans', NULL),
      ('TXN-20260320-006', '2026-03-20', '16:00', '[{"name":"Hoppy Trails IPA","qty":4,"price":7.00},{"name":"Wings","qty":2,"price":12.00}]', 52.00, 4.16, 10.40, 66.56, 'credit', 'Rachel P', 'Table 12 Group', 'Happy hour group'),
      ('TXN-20260320-007', '2026-03-20', '17:15', '[{"name":"Summer Shandy","qty":2,"price":6.50},{"name":"Nachos","qty":1,"price":11.00}]', 24.00, 1.92, 4.80, 30.72, 'credit', 'Dave K', 'Jessica Lane', NULL),
      ('TXN-20260321-001', '2026-03-21', '11:30', '[{"name":"Golden Sunrise Lager","qty":2,"price":6.50},{"name":"Salad","qty":1,"price":10.00}]', 23.00, 1.84, 3.50, 28.34, 'credit', 'Lisa M', 'Pat Williams', 'Lunch regular'),
      ('TXN-20260321-002', '2026-03-21', '12:00', '[{"name":"Hazy Daze NEIPA","qty":1,"price":8.00},{"name":"Grilled Cheese","qty":1,"price":10.00}]', 18.00, 1.44, 3.60, 23.04, 'credit', 'Rachel P', 'Alex Kim', NULL),
      ('TXN-20260321-003', '2026-03-21', '13:00', '[{"name":"Growler Fill IPA","qty":1,"price":18.00}]', 18.00, 1.44, 0.00, 19.44, 'cash', 'Dave K', 'Bob Harris', 'Growler refill'),
      ('TXN-20260321-004', '2026-03-21', '14:30', '[{"name":"Citrus Wheat","qty":2,"price":6.50},{"name":"Pretzel Bites","qty":1,"price":9.00}]', 22.00, 1.76, 4.40, 28.16, 'credit', 'Lisa M', 'Diana Chen', NULL),
      ('TXN-20260321-005', '2026-03-21', '16:00', '[{"name":"Red Rye Ale","qty":1,"price":7.00},{"name":"Midnight Porter","qty":1,"price":7.50},{"name":"Wings","qty":1,"price":12.00}]', 26.50, 2.12, 5.30, 33.92, 'debit', 'Rachel P', 'Frank Nguyen', NULL),
      ('TXN-20260321-006', '2026-03-21', '17:00', '[{"name":"6-Pack IPA To Go","qty":2,"price":14.00}]', 28.00, 2.24, 0.00, 30.24, 'credit', 'Dave K', 'Online Order #445', 'Pickup order'),
      ('TXN-20260321-007', '2026-03-21', '18:30', '[{"name":"Hoppy Trails IPA","qty":3,"price":7.00},{"name":"Golden Sunrise Lager","qty":2,"price":6.50},{"name":"Pizza","qty":1,"price":16.00}]', 50.00, 4.00, 10.00, 64.00, 'credit', 'Lisa M', 'Corporate Event', 'Company gathering'),
      ('TXN-20260322-001', '2026-03-22', '12:00', '[{"name":"Flight Sampler","qty":2,"price":15.00},{"name":"Cheese Board","qty":1,"price":18.00}]', 48.00, 3.84, 9.60, 61.44, 'credit', 'Rachel P', 'Wine & Beer Club', 'Monthly tasting event');
    `);

    // Distributions
    await client.query(`
      INSERT INTO distributions (distributor, order_date, delivery_date, product, quantity, unit_price, total, region, status, tracking_number, notes) VALUES
      ('Valley Distributing', '2026-01-25', '2026-02-01', 'Hoppy Trails IPA 16oz 4-pack', 200, 12.99, 2598.00, 'Metro Area', 'delivered', 'VD-2026-00142', 'Initial launch shipment'),
      ('Valley Distributing', '2026-02-10', '2026-02-17', 'Golden Sunrise Lager 12oz 6-pack', 300, 10.99, 3297.00, 'Metro Area', 'delivered', 'VD-2026-00188', 'Strong demand, reorder expected'),
      ('Mountain Beverage Co', '2026-02-15', '2026-02-22', 'Hoppy Trails IPA Kegs', 10, 165.00, 1650.00, 'Mountain Region', 'delivered', 'MBC-2026-0055', 'Restaurant accounts'),
      ('Mountain Beverage Co', '2026-02-20', '2026-02-27', 'Citrus Wheat 16oz 4-pack', 150, 11.99, 1798.50, 'Mountain Region', 'delivered', 'MBC-2026-0062', 'Seasonal release'),
      ('Coastal Distributors', '2026-03-01', '2026-03-08', 'Hoppy Trails IPA 16oz 4-pack', 250, 12.99, 3247.50, 'Coastal Region', 'in-transit', 'CD-2026-00091', 'New territory expansion'),
      ('Coastal Distributors', '2026-03-01', '2026-03-08', 'Golden Sunrise Lager 12oz 6-pack', 200, 10.99, 2198.00, 'Coastal Region', 'in-transit', 'CD-2026-00092', 'Paired with IPA shipment'),
      ('Valley Distributing', '2026-03-05', '2026-03-12', 'Red Rye Ale 16oz 4-pack', 180, 12.49, 2248.20, 'Metro Area', 'in-transit', 'VD-2026-00215', 'New SKU introduction'),
      ('Valley Distributing', '2026-03-10', '2026-03-17', 'Summer Shandy 12oz 6-pack', 250, 10.99, 2747.50, 'Metro Area', 'pending', 'VD-2026-00230', 'Summer seasonal launch'),
      ('Mountain Beverage Co', '2026-03-12', '2026-03-19', 'Midnight Porter 16oz 4-pack', 100, 12.99, 1299.00, 'Mountain Region', 'pending', 'MBC-2026-0078', 'Limited release'),
      ('Direct Delivery', '2026-03-01', '2026-03-01', 'Red Rye Ale Sixth Barrel', 5, 85.00, 425.00, 'Local', 'delivered', 'DD-2026-0015', 'Local restaurant delivery'),
      ('Valley Distributing', '2026-03-15', '2026-03-22', 'Hoppy Trails IPA 16oz 4-pack', 300, 12.99, 3897.00, 'Metro Area', 'pending', 'VD-2026-00248', 'Restock order'),
      ('Coastal Distributors', '2026-03-15', '2026-03-22', 'Session Pale Ale 12oz 6-pack', 200, 9.99, 1998.00, 'Coastal Region', 'pending', NULL, 'Awaiting pickup'),
      ('Mountain Beverage Co', '2026-03-18', '2026-03-25', 'Golden Sunrise Lager Kegs', 8, 145.00, 1160.00, 'Mountain Region', 'pending', NULL, 'Bar and restaurant accounts'),
      ('Statewide Beverage', '2026-03-20', '2026-03-27', 'Hoppy Trails IPA 16oz 4-pack', 400, 12.99, 5196.00, 'Statewide', 'pending', NULL, 'New distributor, first order'),
      ('Statewide Beverage', '2026-03-20', '2026-03-27', 'Golden Sunrise Lager 12oz 6-pack', 350, 10.99, 3846.50, 'Statewide', 'pending', NULL, 'New distributor, first order');
    `);

    // Lab Results
    await client.query(`
      INSERT INTO lab_results (batch_id, test_type, date, result, unit, expected_range, status, technician, equipment_used, notes) VALUES
      (1, 'ABV', '2026-01-26', '6.9', '%', '6.5-7.2', 'pass', 'Dr. Lisa Park', 'Anton Paar DMA 35', 'Within target range'),
      (1, 'IBU', '2026-01-26', '65', 'IBU', '60-70', 'pass', 'Dr. Lisa Park', 'Spectrophotometer UV-1800', 'Good bitterness level'),
      (1, 'Dissolved Oxygen', '2026-01-28', '22', 'ppb', '<50', 'pass', 'Mark Stevens', 'Hach LDO Sensor', 'Post-packaging DO check'),
      (2, 'ABV', '2026-02-12', '5.2', '%', '4.8-5.4', 'pass', 'Dr. Lisa Park', 'Anton Paar DMA 35', 'Clean lager profile'),
      (2, 'pH', '2026-02-12', '4.25', 'pH', '4.1-4.4', 'pass', 'Mark Stevens', 'Hanna pH Meter HI5222', 'Within range'),
      (2, 'Turbidity', '2026-02-13', '0.8', 'NTU', '<1.0', 'pass', 'Dr. Lisa Park', 'Hach TU5200', 'Excellent clarity for lager'),
      (3, 'Gravity Check', '2026-01-20', '1.020', 'SG', '1.012-1.016', 'in-progress', 'Mark Stevens', 'Anton Paar DMA 35', 'Still fermenting, not at FG yet'),
      (4, 'ABV', '2026-02-08', '5.2', '%', '4.8-5.5', 'pass', 'Dr. Lisa Park', 'Anton Paar DMA 35', 'Light wheat beer profile'),
      (4, 'Microbe Screen', '2026-02-08', 'Negative', 'Pass/Fail', 'Negative', 'pass', 'Dr. Lisa Park', 'Microscope Olympus CX43', 'No wild yeast or bacteria detected'),
      (5, 'ABV', '2026-02-20', '9.5', '%', '9.0-10.0', 'pass', 'Dr. Lisa Park', 'Anton Paar DMA 35', 'Strong imperial stout'),
      (7, 'Haze Check', '2026-02-10', '145', 'NTU', '100-200', 'pass', 'Mark Stevens', 'Hach TU5200', 'Perfect haze for NEIPA style'),
      (8, 'ABV', '2026-02-26', '5.6', '%', '5.3-5.9', 'pass', 'Dr. Lisa Park', 'Anton Paar DMA 35', 'Good rye ale character'),
      (8, 'Color', '2026-02-26', '14.2', 'SRM', '12-16', 'pass', 'Mark Stevens', 'Spectrophotometer UV-1800', 'Nice amber/red color'),
      (10, 'ABV', '2026-03-08', '4.2', '%', '4.0-4.5', 'pass', 'Dr. Lisa Park', 'Anton Paar DMA 35', 'Session strength confirmed'),
      (6, 'pH', '2026-02-28', '3.85', 'pH', '3.5-4.2', 'pass', 'Mark Stevens', 'Hanna pH Meter HI5222', 'Appropriate acidity for shandy');
    `);

    // Equipment
    await client.query(`
      INSERT INTO equipment (name, type, manufacturer, model, serial_number, purchase_date, last_maintenance, next_maintenance, status, location, notes) VALUES
      ('15 BBL Brewhouse', 'Brewhouse', 'SS Brewtech', 'Pro 15', 'SSBH-2022-0045', '2022-03-15', '2026-02-01', '2026-05-01', 'operational', 'Brewhouse A', '3-vessel system with whirlpool'),
      ('Canning Line', 'Packaging', 'Wild Goose', 'WGC-250', 'WG-2023-0122', '2023-06-01', '2026-03-01', '2026-06-01', 'operational', 'Packaging Hall', '250 cans per minute capacity'),
      ('Glycol Chiller', 'Temperature Control', 'G&D Chillers', 'GD-5T', 'GDC-2022-0088', '2022-03-15', '2026-01-15', '2026-04-15', 'operational', 'Mechanical Room', '5 ton capacity, serves all fermenters'),
      ('Grain Mill', 'Milling', 'Blichmann', 'ProMill-3', 'BPM-2022-0034', '2022-04-01', '2026-02-15', '2026-05-15', 'operational', 'Grain Room', '2-roller mill, 1000 lb/hr'),
      ('Keg Washer', 'Cleaning', 'Premier Stainless', 'KW-2', 'PS-KW-2023-011', '2023-01-15', '2026-03-10', '2026-06-10', 'operational', 'Keg Wash Area', 'Semi-automatic, 30 kegs/hr'),
      ('Dissolved Oxygen Meter', 'Lab Equipment', 'Hach', 'LDO II', 'HACH-LDO-2024-05', '2024-02-01', '2026-03-15', '2026-06-15', 'operational', 'Lab', 'Portable DO meter for inline testing'),
      ('pH Meter', 'Lab Equipment', 'Hanna Instruments', 'HI5222', 'HI-5222-2024-12', '2024-01-15', '2026-03-01', '2026-06-01', 'operational', 'Lab', 'Benchtop pH/ORP meter'),
      ('CO2 Tank System', 'Gas', 'Airgas', 'Bulk CO2', 'AG-CO2-2022-001', '2022-03-15', '2026-02-20', '2026-05-20', 'operational', 'Gas Storage', '1500 lb bulk CO2 tank'),
      ('Boiler', 'Steam', 'Fulton', 'FB-050-L', 'FUL-2022-0067', '2022-03-15', '2026-01-20', '2026-04-20', 'operational', 'Mechanical Room', '50 HP steam boiler'),
      ('Bottling Line', 'Packaging', 'Meheen', 'M6', 'MEH-2024-0033', '2024-08-01', '2026-02-10', '2026-05-10', 'operational', 'Packaging Hall', '6-head bottle filler'),
      ('Walk-in Cooler', 'Cold Storage', 'Kolpak', 'P7-1010-CT', 'KPK-2022-0015', '2022-03-15', '2026-01-10', '2026-07-10', 'operational', 'Cold Room', '10x10 walk-in, 34F'),
      ('Heat Exchanger', 'Brewing', 'Duda Diesel', 'PHE-50', 'DD-PHE-2022-009', '2022-03-15', '2026-03-05', '2026-06-05', 'operational', 'Brewhouse A', '50 plate heat exchanger'),
      ('CIP Cart', 'Cleaning', 'Alpha Brewing Ops', 'CIP-Mobile', 'ABO-CIP-2023-02', '2023-03-01', '2026-03-12', '2026-06-12', 'operational', 'Brewhouse A', 'Mobile CIP with chemical tanks'),
      ('Forklift', 'Material Handling', 'Toyota', '8FGCU25', 'TOY-FL-2023-007', '2023-09-01', '2026-02-28', '2026-05-28', 'operational', 'Warehouse', 'Propane powered, 5000 lb capacity'),
      ('Centrifuge', 'Separation', 'Alfa Laval', 'Brew 80', 'AL-B80-2024-001', '2024-06-01', '2026-03-18', '2026-06-18', 'maintenance', 'Brewhouse B', 'Bearing replacement scheduled');
    `);

    // Events
    await client.query(`
      INSERT INTO events (name, type, date, start_time, end_time, capacity, tickets_sold, ticket_price, description, status, notes) VALUES
      ('St. Patricks Day Bash', 'Holiday Party', '2026-03-17', '12:00', '22:00', 300, 285, 15.00, 'Live music, green beer, Irish food specials', 'completed', 'Record attendance, great weather'),
      ('Brewers Dinner', 'Dinner', '2026-03-28', '18:00', '21:00', 40, 38, 75.00, '5-course beer pairing dinner with head brewer', 'confirmed', 'Chef collaboration with Blue Heron'),
      ('Trivia Night', 'Weekly Event', '2026-03-25', '19:00', '21:30', 80, 0, 0.00, 'Free weekly trivia with beer prizes', 'confirmed', 'Teams of up to 6'),
      ('Spring Beer Release', 'Release Party', '2026-04-05', '14:00', '20:00', 200, 120, 10.00, 'Debut of 3 new spring seasonals', 'on-sale', 'Includes tasting glass and 3 pours'),
      ('Live Music: The Hops', 'Live Music', '2026-04-10', '20:00', '23:00', 150, 45, 12.00, 'Local band The Hops performs live', 'on-sale', 'Outdoor stage weather permitting'),
      ('Homebrew Competition', 'Competition', '2026-04-18', '10:00', '16:00', 100, 62, 25.00, 'Annual homebrew competition, BJCP certified', 'on-sale', 'Registration includes entry for 3 beers'),
      ('Yoga & Brews', 'Wellness', '2026-04-12', '09:00', '11:00', 30, 28, 20.00, 'Morning yoga session followed by brunch and beer', 'confirmed', 'Instructor: Sarah from Zen Studio'),
      ('Barrel Aged Stout Release', 'Release Party', '2026-04-25', '12:00', '18:00', 150, 0, 15.00, 'Limited release bourbon barrel aged imperial stout', 'planned', 'Limit 2 bottles per person'),
      ('Private Corporate Event', 'Private', '2026-04-02', '17:00', '20:00', 60, 60, 45.00, 'TechCorp annual team outing with brewery tour', 'confirmed', 'Full buyout of event space'),
      ('Cinco de Mayo Fiesta', 'Holiday Party', '2026-05-05', '14:00', '22:00', 250, 0, 10.00, 'Mexican food trucks, mariachi band, lime gose release', 'planned', 'Partnering with 3 food trucks'),
      ('Mothers Day Brunch', 'Brunch', '2026-05-10', '10:00', '14:00', 80, 0, 35.00, 'Special brunch buffet with mimosas and light beers', 'planned', 'Kids eat free'),
      ('Beer Run 5K', 'Charity', '2026-05-16', '08:00', '12:00', 500, 180, 30.00, '5K fun run ending at brewery, benefits local food bank', 'on-sale', 'Includes race shirt and post-run beer'),
      ('Summer Kickoff Party', 'Seasonal', '2026-05-23', '14:00', '22:00', 400, 0, 0.00, 'Free event, live DJs, food trucks, new summer menu debut', 'planned', 'Sponsored by local businesses'),
      ('Paint & Pint Night', 'Arts', '2026-04-15', '18:00', '20:30', 35, 22, 35.00, 'Guided painting session with 2 included beers', 'on-sale', 'All materials provided'),
      ('Cask Night', 'Special Release', '2026-03-27', '17:00', '21:00', 100, 55, 0.00, 'Free event featuring 4 unique cask-conditioned ales', 'confirmed', 'First come first served for cask pours');
    `);

    // Loyalty Members
    await client.query(`
      INSERT INTO loyalty_members (name, email, phone, tier, points, join_date, visits, total_spent, birthday, favorite_beer, status, notes) VALUES
      ('John Parker', 'john.parker@email.com', '555-0101', 'gold', 2450, '2024-06-15', 85, 1890.50, '1985-04-12', 'Hoppy Trails IPA', 'active', 'Founding member, brings friends regularly'),
      ('Sarah Mitchell', 'sarah.m@email.com', '555-0102', 'silver', 1200, '2024-09-01', 48, 980.00, '1990-08-22', 'Golden Sunrise Lager', 'active', 'Prefers lighter beers'),
      ('Mike & Amy Roberts', 'roberts.family@email.com', '555-0103', 'gold', 3100, '2024-06-20', 95, 2450.75, '1982-11-05', 'Citrus Wheat', 'active', 'Couple membership, frequent visitors'),
      ('Chris Evans', 'chris.e@email.com', '555-0104', 'bronze', 450, '2025-03-10', 18, 320.00, '1995-01-30', 'Midnight Porter', 'active', 'New member, growing engagement'),
      ('Diana Chen', 'diana.chen@email.com', '555-0105', 'silver', 980, '2024-11-15', 42, 850.25, '1988-07-17', 'Hazy Daze NEIPA', 'active', 'Beer enthusiast, attends events'),
      ('Frank Nguyen', 'frank.n@email.com', '555-0106', 'gold', 2800, '2024-06-18', 92, 2100.00, '1979-12-03', 'Red Rye Ale', 'active', 'Homebrewer, great word of mouth'),
      ('Pat Williams', 'pat.w@email.com', '555-0107', 'silver', 1500, '2024-08-05', 55, 1150.50, '1992-03-25', 'Session Pale Ale', 'active', 'Lunch regular'),
      ('Alex Kim', 'alex.kim@email.com', '555-0108', 'bronze', 350, '2025-05-20', 14, 245.00, '1998-09-14', 'Hazy Daze NEIPA', 'active', 'Young craft beer fan'),
      ('Bob Harris', 'bob.harris@email.com', '555-0109', 'platinum', 5200, '2024-06-15', 150, 4500.00, '1975-06-08', 'Barrel Aged Stout', 'active', 'Top spender, buys growlers weekly'),
      ('Jessica Lane', 'jess.lane@email.com', '555-0110', 'silver', 1100, '2024-10-01', 40, 920.00, '1991-02-14', 'Summer Shandy', 'active', 'Prefers seasonal offerings'),
      ('Tom Baker', 'tom.baker@email.com', '555-0111', 'gold', 2200, '2024-07-01', 78, 1780.00, '1983-10-20', 'Hoppy Trails IPA', 'active', 'Also an employee, staff discount tracked'),
      ('Maria Santos', 'maria.s@email.com', '555-0112', 'bronze', 280, '2025-08-15', 11, 195.00, '1996-05-30', 'Citrus Wheat', 'active', 'Referred by Diana Chen'),
      ('Greg Thompson', 'greg.t@email.com', '555-0113', 'silver', 1350, '2024-09-15', 50, 1050.00, '1987-08-11', 'Belgian Tripel', 'active', 'Enjoys Belgian styles'),
      ('Linda Morrison', 'linda.m@email.com', '555-0114', 'bronze', 150, '2026-01-10', 6, 110.00, '1970-12-25', 'Golden Sunrise Lager', 'active', 'New member'),
      ('Dave Rodriguez', 'dave.r@email.com', '555-0115', 'inactive', 800, '2024-08-20', 32, 680.00, '1989-04-02', 'Oatmeal Stout', 'inactive', 'Hasnt visited in 3 months');
    `);

    // Financial Records
    await client.query(`
      INSERT INTO financial_records (date, type, category, amount, description, reference_number, vendor, payment_method, status, notes) VALUES
      ('2026-03-01', 'expense', 'Raw Materials', 4250.00, 'Monthly grain order from Great Western Malting', 'INV-GWM-2026-0312', 'Great Western Malting', 'ACH', 'paid', 'Bulk discount applied'),
      ('2026-03-01', 'expense', 'Raw Materials', 1850.00, 'Hop order from Yakima Chief', 'INV-YCH-2026-0089', 'Yakima Chief', 'ACH', 'paid', 'Citra and Mosaic for spring batches'),
      ('2026-03-05', 'income', 'Taproom Sales', 8520.00, 'Weekly taproom revenue Mar 1-7', 'DEP-2026-0305', NULL, 'deposit', 'reconciled', 'Strong week with St Pats pregaming'),
      ('2026-03-05', 'expense', 'Utilities', 2100.00, 'Monthly electric bill', 'UTIL-ELEC-2026-03', 'City Power Co', 'ACH', 'paid', 'Higher due to increased production'),
      ('2026-03-07', 'expense', 'Packaging', 3200.00, '16oz can order - 20 pallets', 'INV-BALL-2026-0145', 'Ball Corporation', 'net-30', 'pending', 'Printed cans for IPA and Wheat'),
      ('2026-03-10', 'income', 'Distribution', 7545.00, 'Valley Distributing payment for Feb orders', 'CHK-VD-2026-0088', 'Valley Distributing', 'check', 'reconciled', 'Covers 3 invoice payments'),
      ('2026-03-10', 'expense', 'Payroll', 18500.00, 'Bi-weekly payroll', 'PAY-2026-0310', NULL, 'ACH', 'paid', '12 employees'),
      ('2026-03-12', 'income', 'Taproom Sales', 9100.00, 'Weekly taproom revenue Mar 8-14', 'DEP-2026-0312', NULL, 'deposit', 'reconciled', 'Steady growth trend'),
      ('2026-03-15', 'expense', 'Rent', 5500.00, 'Monthly facility lease', 'RENT-2026-03', 'Industrial Properties LLC', 'check', 'paid', '5000 sq ft brewery and taproom'),
      ('2026-03-15', 'expense', 'Insurance', 1200.00, 'Monthly insurance premium', 'INS-2026-03', 'Brewery Insurance Group', 'ACH', 'paid', 'General liability and property'),
      ('2026-03-17', 'income', 'Events', 4275.00, 'St Patricks Day event ticket sales', 'EVT-STPAT-2026', NULL, 'mixed', 'reconciled', '285 tickets at $15'),
      ('2026-03-18', 'income', 'Distribution', 3448.50, 'Mountain Beverage Co payment', 'CHK-MBC-2026-0041', 'Mountain Beverage Co', 'check', 'pending', 'Feb distribution invoices'),
      ('2026-03-19', 'income', 'Taproom Sales', 12400.00, 'Weekly taproom revenue Mar 15-21 (St Pats week)', 'DEP-2026-0319', NULL, 'deposit', 'reconciled', 'Best week of the year so far'),
      ('2026-03-20', 'expense', 'Maintenance', 850.00, 'Centrifuge bearing replacement parts', 'INV-ALFA-2026-0012', 'Alfa Laval', 'credit card', 'paid', 'Scheduled maintenance'),
      ('2026-03-22', 'expense', 'Marketing', 1500.00, 'Spring seasonal marketing campaign', 'INV-MKTG-2026-03', 'Local Ad Agency', 'net-30', 'pending', 'Social media and print ads');
    `);

    // CIP Schedules
    await client.query(`
      INSERT INTO cip_schedules (equipment, scheduled_date, completed_date, cip_type, chemical_concentration, temperature, duration_minutes, operator, status, verification, notes) VALUES
      ('FV-01', '2026-03-10', '2026-03-10', 'Full CIP', '2% caustic', 160, 45, 'Jake Wilson', 'completed', 'ATP test passed', 'Post-batch cleaning for porter'),
      ('FV-03', '2026-03-08', '2026-03-08', 'Full CIP', '2% caustic, 1% acid', 165, 60, 'Tom Baker', 'completed', 'ATP test passed', 'Deep clean with acid rinse'),
      ('BT-01', '2026-03-12', '2026-03-12', 'Quick Rinse', '1% caustic', 140, 20, 'Jake Wilson', 'completed', 'Visual inspection passed', 'Between same-style batches'),
      ('BT-03', '2026-03-09', '2026-03-09', 'Full CIP', '2% caustic, 1% acid', 165, 60, 'Maria Lopez', 'completed', 'ATP test passed', 'Quarterly deep clean'),
      ('Canning Line', '2026-03-15', '2026-03-15', 'Sanitize', '200ppm PAA', 68, 15, 'Jake Wilson', 'completed', 'Swab test passed', 'Pre-run sanitization'),
      ('Heat Exchanger', '2026-03-14', NULL, 'Full CIP', '3% caustic', 170, 90, 'Tom Baker', 'completed', 'Flow rate verified', 'Extended time for plate exchanger'),
      ('FV-02', '2026-03-25', NULL, 'Full CIP', '2% caustic', 160, 45, 'Jake Wilson', 'scheduled', NULL, 'After NEIPA batch completes'),
      ('FV-04', '2026-03-28', NULL, 'Full CIP', '2% caustic, 1% acid', 165, 60, 'Tom Baker', 'scheduled', NULL, 'Post oatmeal stout, needs extra acid'),
      ('BK-01', '2026-03-26', NULL, 'Full CIP', '2% caustic', 160, 45, 'Maria Lopez', 'scheduled', NULL, 'Weekly boil kettle clean'),
      ('MLT-01', '2026-03-26', NULL, 'Full CIP', '2% caustic', 155, 45, 'Maria Lopez', 'scheduled', NULL, 'Weekly mash tun clean'),
      ('Bottling Line', '2026-03-27', NULL, 'Sanitize', '200ppm PAA', 68, 15, 'Jake Wilson', 'scheduled', NULL, 'Pre-run for barrel aged stout bottles'),
      ('CT-01', '2026-04-01', NULL, 'Full CIP', '2% caustic, 1% acid', 165, 60, 'Tom Baker', 'scheduled', NULL, 'After barrel aged stout transfer'),
      ('Keg Washer', '2026-03-30', NULL, 'Maintenance CIP', '3% caustic', 170, 90, 'Jake Wilson', 'scheduled', NULL, 'Monthly deep clean of washer internals'),
      ('HLT-01', '2026-03-26', NULL, 'Descale', '2% acid', 140, 60, 'Tom Baker', 'scheduled', NULL, 'Quarterly descaling'),
      ('CIP Cart', '2026-03-29', NULL, 'Self-Clean', '2% caustic', 160, 30, 'Maria Lopez', 'scheduled', NULL, 'Clean the cleaner');
    `);

    // Vendors
    await client.query(`
      INSERT INTO vendors (name, category, contact_name, email, phone, address, website, payment_terms, lead_time_days, rating, status, notes) VALUES
      ('Great Western Malting', 'Grain', 'Jim Henderson', 'jim@gwmalting.com', '360-555-0201', '1600 Malt Way, Vancouver WA 98660', 'www.gwmalting.com', 'Net 30', 7, 4.8, 'active', 'Primary base malt supplier'),
      ('Yakima Chief', 'Hops', 'Karen Wolfe', 'karen@yakimachief.com', '509-555-0202', '306 Hop Rd, Sunnyside WA 98944', 'www.yakimachief.com', 'Net 30', 5, 4.9, 'active', 'Premium hop supplier, great variety'),
      ('Fermentis', 'Yeast', 'Pierre Dubois', 'pierre@fermentis.com', '414-555-0203', '7501 Brewery Blvd, Milwaukee WI 53214', 'www.fermentis.com', 'Net 45', 10, 4.7, 'active', 'Dry yeast supplier'),
      ('Ball Corporation', 'Packaging', 'Steve Martinez', 'steve.m@ball.com', '303-555-0204', '9300 Aluminum Dr, Broomfield CO 80021', 'www.ball.com', 'Net 30', 14, 4.5, 'active', 'Custom printed cans, min 1 pallet'),
      ('Briess Malt', 'Grain', 'Amy Johnson', 'amy@briess.com', '920-555-0205', '625 Malt St, Chilton WI 53014', 'www.briess.com', 'Net 30', 7, 4.6, 'active', 'Specialty malts'),
      ('Hop Union', 'Hops', 'Dave Richards', 'dave@hopunion.com', '509-555-0206', '1150 Hop Valley Rd, Yakima WA 98901', 'www.hopunion.com', 'Net 30', 5, 4.4, 'active', 'Backup hop supplier'),
      ('Five Star Chemicals', 'Cleaning', 'Nancy White', 'nancy@fivestarchemicals.com', '303-555-0207', '4250 Chem Pkwy, Commerce City CO 80022', 'www.fivestarchemicals.com', 'Net 15', 3, 4.8, 'active', 'Star San and PBW supplier'),
      ('Industrial Properties LLC', 'Facility', 'Robert Brown', 'robert@indprop.com', '555-0208', '100 Main St Suite 400, Brewtown USA', NULL, 'Monthly', 0, 4.0, 'active', 'Facility lease management'),
      ('Alfa Laval', 'Equipment', 'Hans Mueller', 'hans@alfalaval.com', '866-555-0209', '5400 International Trade Dr, Richmond VA 23231', 'www.alfalaval.com', 'Net 60', 21, 4.7, 'active', 'Centrifuge and separator parts'),
      ('Wild Goose Engineering', 'Equipment', 'Lisa Grant', 'lisa@wildgooseeng.com', '720-555-0210', '1460 Wild Goose Way, Louisville CO 80027', 'www.wildgooseeng.com', 'Net 30', 14, 4.6, 'active', 'Canning line parts and service'),
      ('Weyermann', 'Grain', 'Klaus Weber', 'klaus@weyermann.de', '011-49-951-555', 'Brennerstrasse 17-19, Bamberg Germany', 'www.weyermann.de', 'Net 45', 30, 4.9, 'active', 'Premium German specialty malts'),
      ('City Power Co', 'Utilities', 'Customer Service', 'service@citypower.com', '555-0212', '200 Power Blvd, Brewtown USA', 'www.citypower.com', 'Net 15', 0, 3.5, 'active', 'Electricity provider'),
      ('Brewery Insurance Group', 'Insurance', 'Diane Foster', 'diane@brewinsure.com', '800-555-0213', '500 Coverage Ln, Hartford CT 06103', 'www.brewinsure.com', 'Monthly', 0, 4.3, 'active', 'Specialized craft beverage insurance'),
      ('Rahr & Sons', 'Grain', 'Tom Rahr', 'tom@rfrmalting.com', '612-555-0214', '800 West Minnehaha Ave, Shakopee MN 55379', 'www.rfrmalting.com', 'Net 30', 7, 4.5, 'active', 'Wheat and specialty malts'),
      ('Local Ad Agency', 'Marketing', 'Creative Director', 'hello@localadagency.com', '555-0215', '75 Creative St, Brewtown USA', 'www.localadagency.com', 'Net 30', 7, 4.2, 'active', 'Handles social media and print campaigns');
    `);

    console.log('Seed data inserted successfully!');
  } catch (err) {
    console.error('Error during seeding:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().then(() => {
  console.log('Seeding complete.');
  process.exit(0);
}).catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
