-- Clear existing VPP providers and insert comprehensive 2025 data
DELETE FROM vpp_providers;

-- Insert comprehensive VPP provider data (August 2025)
INSERT INTO vpp_providers (
  id, name, company, signup_bonus, estimated_annual_reward, 
  min_battery_kwh, max_battery_kwh, compatible_battery_brands, 
  compatible_inverter_brands, states_available, requirements, 
  website, is_active
) VALUES 
(
  gen_random_uuid(), 'SmartShift (Amber for Batteries)', 'Amber Electric', 
  0, 500, 5, 100, 
  ARRAY['Tesla Powerwall 2', 'Tesla Powerwall 3', 'Enphase IQ Battery', 'BYD HVM', 'BYD HVS', 'SolarEdge Energy Bank', 'AlphaESS', 'Sungrow SBR', 'Sungrow SBH', 'Redback', 'Sigenergy SigenStor', 'GivEnergy'],
  ARRAY['SolarEdge Energy Hub', 'Fronius GEN24', 'Sungrow SH', 'Redback hybrids'],
  ARRAY['NSW', 'VIC', 'QLD', 'SA', 'TAS', 'ACT'],
  'Live compatibility list updated weekly',
  'https://www.amber.com.au', true
),
(
  gen_random_uuid(), 'Discover Energy VPP', 'Discover Energy',
  0, 400, 5, 100,
  ARRAY['AlphaESS Smile', 'BYD HVM', 'BYD HVS', 'LG RESU Prime', 'Pylontech', 'Dyness', 'Sungrow SBR', 'Sungrow SBH', 'SAJ B2 HV'],
  ARRAY['GoodWe EH', 'GoodWe ET', 'GoodWe ES', 'SolarEdge Energy Hub', 'SolarEdge HD-Wave', 'SolarEdge Genesis', 'Sungrow SH', 'Solis S5', 'Solis S6', 'SAJ H2'],
  ARRAY['NSW', 'VIC', 'QLD', 'SA', 'TAS', 'ACT'],
  'Full matrix published online',
  'https://www.discoverenergy.com.au', true
),
(
  gen_random_uuid(), 'AGL VPP', 'AGL',
  0, 350, 5, 100,
  ARRAY['Tesla Powerwall 2', 'Tesla Powerwall 3', 'SolarEdge Energy Bank', 'LG Home Battery', 'Sungrow HV'],
  ARRAY['SolarEdge StorEdge', 'SolarEdge Energy Hub', 'SolarEdge HD-Wave'],
  ARRAY['NSW', 'VIC', 'QLD', 'SA', 'TAS', 'ACT'],
  'Eligibility on AGL site',
  'https://www.agl.com.au', true
),
(
  gen_random_uuid(), 'PowerResponse VPP', 'EnergyAustralia',
  0, 300, 5, 100,
  ARRAY['Tesla Powerwall 2', 'AlphaESS', 'Redback', 'LG Chem'],
  ARRAY['SolarEdge (for LG Chem)', 'Redback hybrids'],
  ARRAY['NSW', 'VIC', 'QLD', 'SA', 'TAS', 'ACT'],
  'Device list on program FAQ',
  'https://www.energyaustralia.com.au', true
),
(
  gen_random_uuid(), 'Origin Loop', 'Origin Energy',
  0, 250, 5, 100,
  ARRAY['Eveready', 'AlphaESS', 'Tesla', 'Sungrow', 'LG', 'SolaX', 'GoodWe'],
  ARRAY['Varies by device'],
  ARRAY['NSW', 'VIC', 'QLD', 'SA', 'TAS', 'ACT'],
  'BYO compatibility check required',
  'https://www.originenergy.com.au', true
),
(
  gen_random_uuid(), 'Tesla Energy Plan / SA VPP', 'Energy Locals / Tesla',
  500, 800, 13.5, 40.5,
  ARRAY['Tesla Powerwall'],
  ARRAY['N/A (AC-coupled)'],
  ARRAY['SA', 'NSW', 'VIC'],
  'Powerwall-only VPP',
  'https://www.tesla.com', true
),
(
  gen_random_uuid(), 'ShineHub Community VPP', 'ShineHub',
  0, 200, 5, 50,
  ARRAY['AlphaESS', 'Hinen'],
  ARRAY['AlphaESS hybrids'],
  ARRAY['NSW', 'SA', 'VIC'],
  'Device-specific offers',
  'https://www.shinehub.com.au', true
),
(
  gen_random_uuid(), 'WATTBANK VPP', 'Diamond Energy',
  0, 300, 5, 100,
  ARRAY['Sungrow', 'GoodWe', 'LG'],
  ARRAY['Sungrow', 'GoodWe', 'LG'],
  ARRAY['NSW', 'VIC', 'QLD', 'SA', 'TAS', 'ACT'],
  'Model list published',
  'https://www.diamondenergy.com.au', true
),
(
  gen_random_uuid(), 'ZEROHERO Battery VPP', 'GloBird Energy',
  0, 250, 5, 100,
  ARRAY['Provider validated'],
  ARRAY['Provider validated'],
  ARRAY['VIC', 'NSW', 'SA'],
  'Case-by-case validation',
  'https://www.globirdenergy.com.au', true
),
(
  gen_random_uuid(), 'Smart Distributed Batteries', 'SolarHub',
  0, 400, 13.5, 27,
  ARRAY['Tesla Powerwall 2'],
  ARRAY['N/A'],
  ARRAY['ACT', 'NSW'],
  'Regional pilot program',
  'https://www.solarhub.com.au', true
),
(
  gen_random_uuid(), 'Nectr VPP / BEE Super FiT', 'Nectr',
  0, 350, 5, 100,
  ARRAY['Provider validated'],
  ARRAY['Provider validated'],
  ARRAY['NSW', 'VIC', 'QLD', 'SA', 'TAS', 'ACT'],
  'Includes high FiT bonus plans',
  'https://www.nectr.com.au', true
),
(
  gen_random_uuid(), 'Battery Rewards (VPP)', 'Synergy',
  0, 300, 5, 100,
  ARRAY['AlphaESS', 'Sungrow', 'Tesla', 'GoodWe'],
  ARRAY['Per SSL'],
  ARRAY['WA'],
  'Requires CSIP-Aus compliance',
  'https://www.synergy.net.au', true
),
(
  gen_random_uuid(), 'Community Wave VPP', 'Horizon Power',
  0, 200, 5, 50,
  ARRAY['Batteries on Horizon eligibility list'],
  ARRAY['Per Horizon compatibility'],
  ARRAY['WA'],
  'Regional WA only',
  'https://www.horizonpower.com.au', true
),
(
  gen_random_uuid(), 'Plico VPP', 'Plico Energy',
  0, 250, 5, 100,
  ARRAY['AlphaESS', 'Redback', 'Sigenergy'],
  ARRAY['AlphaESS hybrids', 'Redback hybrids', 'Sigenergy hybrids'],
  ARRAY['WA'],
  'Package-based offerings',
  'https://www.plicoenergy.com.au', true
),
(
  gen_random_uuid(), 'VPP Advantage / Smart Energy Hub', 'ENGIE',
  0, 300, 5, 100,
  ARRAY['Provider validated'],
  ARRAY['Provider validated'],
  ARRAY['NSW', 'VIC', 'QLD', 'SA', 'TAS', 'ACT'],
  'Often bundled with energy plans',
  'https://www.engie.com.au', true
),
(
  gen_random_uuid(), 'Simply VPP', 'Simply Energy',
  0, 250, 5, 100,
  ARRAY['Tesla Powerwall', 'AlphaESS'],
  ARRAY['Varies'],
  ARRAY['VIC', 'SA', 'NSW'],
  'Offer-based program',
  'https://www.simplyenergy.com.au', true
),
(
  gen_random_uuid(), 'Red VPP / Battery Bundles', 'Red Energy',
  0, 300, 5, 100,
  ARRAY['Tesla', 'AlphaESS'],
  ARRAY['Varies'],
  ARRAY['NSW', 'VIC', 'QLD', 'SA', 'TAS', 'ACT'],
  'Partner-based offers',
  'https://www.redenergy.com.au', true
),
(
  gen_random_uuid(), 'Battery VPP (partnered)', 'Momentum Energy',
  0, 250, 5, 100,
  ARRAY['Partner validated'],
  ARRAY['Partner validated'],
  ARRAY['NSW', 'VIC', 'QLD', 'SA', 'TAS', 'ACT'],
  'Program availability varies',
  'https://www.momentumenergy.com.au', true
),
(
  gen_random_uuid(), 'Partner VPP offers', 'Lumo Energy',
  0, 250, 5, 100,
  ARRAY['Partner validated'],
  ARRAY['Partner validated'],
  ARRAY['SA', 'VIC'],
  'Linked with Red Energy',
  'https://www.lumoenergy.com.au', true
),
(
  gen_random_uuid(), 'Battery orchestration pilot/VPP', 'Alinta Energy',
  0, 200, 5, 100,
  ARRAY['Partner validated'],
  ARRAY['Partner validated'],
  ARRAY['WA', 'QLD', 'VIC'],
  'Pilot and retailer partnerships',
  'https://www.alintaenergy.com.au', true
);