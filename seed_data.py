import sqlite3
import os
from datetime import datetime, timedelta

DB_NAME = "gauge_management.db"

def seed():
    conn = sqlite3.connect(DB_NAME)
    cur = conn.cursor()

    with open("schema.sql", "r") as f:
        cur.executescript(f.read())

    cur.execute("SELECT COUNT(*) FROM gauges")
    if cur.fetchone()[0] > 0:
        print("Database already has data. Skipping seed.")
        conn.close()
        return

    today = datetime.now()

    sample_gauges = [
        (
            'G21-06-204', 'G21-06-204', 'Granite Surface Plate', '630X630X100MM Grade 0', '0.001mm',
            'MFG-ST-882', 'SN-2022-901', 'Quality Assurance', 'Calibration Room', 'Rack A1', 'GSP-630',
            'India', 'Flatness', 'Direct', 'Comparative', 'Reference', 'Periodic',
            'Surface Plate', (today - timedelta(days=400)).strftime('%Y-%m-%d'), 'Accept',
            'Master reference surface plate. Temperature controlled.', 12,
            (today - timedelta(days=20)).strftime('%Y-%m-%d'), (today + timedelta(days=345)).strftime('%Y-%m-%d'),
            'dwg_surface_plate.svg', 'Granite Surface Plate Specification'
        ),
        (
            'G21-01-101', 'G21-01-101', 'Digital Outside Micrometer', '0-25mm / 0.001mm', '0.001mm',
            'MIT-293-240', 'SN-402911', 'Machining', 'Machine Shop Line 1', 'Station 04', 'QuantuMike 293',
            'Japan', 'Outside Diameter', 'Digital', 'Direct', 'Working', 'Periodic',
            'Micrometer', (today - timedelta(days=300)).strftime('%Y-%m-%d'), 'Accept',
            'IP65 water/dust resistant. Carbide tipped faces.', 6,
            (today - timedelta(days=160)).strftime('%Y-%m-%d'), (today + timedelta(days=20)).strftime('%Y-%m-%d'),
            'dwg_micrometer.svg', 'Outside Micrometer Blueprint & Error Limits'
        ),
        (
            'G21-01-102', 'G21-01-102', 'Digital Vernier Caliper', '0-150mm / 0.01mm', '0.01mm',
            'BAK-DVC-150', 'SN-811902', 'Tool Room', 'Tool Crib A', 'Drawer 2', 'DVC-150',
            'India', 'OD, ID, Depth', 'Digital', 'Direct', 'Working', 'Periodic',
            'Caliper', (today - timedelta(days=250)).strftime('%Y-%m-%d'), 'Accept',
            'Stainless steel hardened beam and jaws.', 12,
            (today - timedelta(days=350)).strftime('%Y-%m-%d'), (today + timedelta(days=15)).strftime('%Y-%m-%d'),
            'dwg_caliper.svg', 'Digital Vernier Caliper Drawing'
        ),
        (
            'G21-01-103', 'G21-01-103', 'Plunger Dial Indicator', '0-10mm / 0.01mm', '0.01mm',
            'BAK-K01', 'SN-552011', 'Quality Assurance', 'Inspection Bay 3', 'Stand B2', 'Dial K-01',
            'India', 'Deflection / Runout', 'Dial', 'Comparative', 'Working', 'Periodic',
            'Dial Gauge', (today - timedelta(days=180)).strftime('%Y-%m-%d'), 'Accept',
            'Jeweled bearing movement with lug back.', 6,
            (today - timedelta(days=170)).strftime('%Y-%m-%d'), (today + timedelta(days=10)).strftime('%Y-%m-%d'),
            'dwg_dial_gauge.svg', 'Plunger Dial Indicator Inspection Scheme'
        ),
        (
            'G21-02-045', 'G21-02-045', 'Digital Height Gauge', '0-300mm / 0.005mm', '0.005mm',
            'MIT-192-663', 'SN-993021', 'Quality Assurance', 'Calibration Room', 'Granite Bench 2', 'Linear Height 192',
            'Japan', 'Height / Stepped Level', 'Digital', 'Direct', 'Standard', 'Periodic',
            'Height Gauge', (today - timedelta(days=500)).strftime('%Y-%m-%d'), 'Accept',
            'Dual column high rigidity structure.', 12,
            (today - timedelta(days=340)).strftime('%Y-%m-%d'), (today + timedelta(days=25)).strftime('%Y-%m-%d'),
            'dwg_height_gauge.svg', 'Height Gauge Column & Scriber Specs'
        ),
        (
            'G21-03-018', 'G21-03-018', 'Thread Plug Gauge', 'M12 x 1.75 6H Go/No-Go', 'N/A',
            'OSG-TPG-M12', 'SN-331002', 'Machining', 'Machine Shop Line 2', 'Fixture Tray 5', 'TPG-Metric',
            'Japan', 'Internal Thread', 'Mechanical', 'Comparative', 'Working', 'Periodic',
            'Thread Gauge', (today - timedelta(days=120)).strftime('%Y-%m-%d'), 'Accept',
            'Hardened alloy steel 60-62 HRC.', 6,
            (today - timedelta(days=190)).strftime('%Y-%m-%d'), (today - timedelta(days=10)).strftime('%Y-%m-%d'),
            'dwg_thread_plug.svg', 'M12 Thread Plug Gauge Boundary Dimensions'
        ),
        (
            'G21-03-022', 'G21-03-022', 'Plain Cylindrical Plug Gauge', 'DIA 25H7 Go/No-Go', '0.001mm',
            'ACC-PPG-25', 'SN-774019', 'Tool Room', 'Tool Crib B', 'Bin C4', 'PPG-25H7',
            'India', 'Internal Bore', 'Mechanical', 'Comparative', 'Working', 'Periodic',
            'Plug Gauge', (today - timedelta(days=190)).strftime('%Y-%m-%d'), 'Accept',
            'Wear allowance checked as per IS 3455.', 6,
            (today - timedelta(days=185)).strftime('%Y-%m-%d'), (today - timedelta(days=5)).strftime('%Y-%m-%d'),
            'dwg_plug_gauge.svg', 'Cylindrical Plug Gauge Tolerance Spec'
        ),
        (
            'G21-04-110', 'G21-04-110', 'Bore Dial Gauge', '50-150mm / 0.002mm', '0.002mm',
            'BAK-B150', 'SN-228741', 'Foundry', 'Foundry QC Room', 'Cabinet F1', 'BG-150',
            'India', 'Internal Cylinder Bore', 'Dial', 'Comparative', 'Working', 'Periodic',
            'Bore Gauge', (today - timedelta(days=220)).strftime('%Y-%m-%d'), 'Accept',
            'Anvils carbide tipped. Self-centering bridge.', 6,
            (today - timedelta(days=150)).strftime('%Y-%m-%d'), (today + timedelta(days=30)).strftime('%Y-%m-%d'),
            'dwg_bore_gauge.svg', 'Bore Dial Gauge Anvil Assembly'
        ),
        (
            'G21-05-088', 'G21-05-088', 'Preset Torque Wrench', '20-100 Nm / 1.0 Nm', '1.0 Nm',
            'NOR-130103', 'SN-601928', 'Assembly', 'Final Assembly Bay', 'Workstation 8', 'Pro 100',
            'UK', 'Torque Force', 'Mechanical Scale', 'Direct', 'Working', 'Periodic',
            'Torque Wrench', (today - timedelta(days=360)).strftime('%Y-%m-%d'), 'Accept',
            'Push-through ratchet mechanism. Accuracy +/- 3%.', 12,
            (today - timedelta(days=355)).strftime('%Y-%m-%d'), (today + timedelta(days=10)).strftime('%Y-%m-%d'),
            'dwg_torque_wrench.svg', 'Torque Wrench Calibration & Lever Diagram'
        ),
        (
            'G21-07-033', 'G21-07-033', 'Universal Bevel Protractor', '0-360 Deg / 5 min', '5 min',
            'INS-2372', 'SN-114002', 'Tool Room', 'Tool Room Inspection', 'Bench 1', 'UBP-360',
            'China', 'Angular Dimension', 'Vernier', 'Direct', 'Working', 'Periodic',
            'Protractor', (today - timedelta(days=400)).strftime('%Y-%m-%d'), 'Accept',
            'With acute angle attachment and magnifying lens.', 12,
            (today - timedelta(days=200)).strftime('%Y-%m-%d'), (today + timedelta(days=165)).strftime('%Y-%m-%d'),
            'dwg_protractor.svg', 'Bevel Protractor Vernier Scale Chart'
        ),
        (
            'G21-08-012', 'G21-08-012', 'Digital Coating Thickness Gauge', '0-1500 um / 1 um', '1.0 um',
            'ELC-456', 'SN-902341', 'Quality Assurance', 'Paint & Coating Lab', 'Locker 4', 'Elcometer 456',
            'UK', 'Dry Film Thickness', 'Digital', 'Direct', 'Standard', 'Periodic',
            'Coating Gauge', (today - timedelta(days=140)).strftime('%Y-%m-%d'), 'Under Repair',
            'Probe connector loose. Sent to OEM for replacement.', 12,
            (today - timedelta(days=380)).strftime('%Y-%m-%d'), (today - timedelta(days=15)).strftime('%Y-%m-%d'),
            'dwg_coating_gauge.svg', 'Coating Thickness Probe Schematic'
        ),
        (
            'G21-09-005', 'G21-09-005', 'Optical Profile Projector', '300mm Dia Screen 10X/20X/50X', '0.001mm',
            'NIK-V12B', 'SN-049182', 'Quality Assurance', 'Metrology Lab', 'Room 102', 'Horizon V-12B',
            'Japan', '2D Profile / Contours', 'Digital Readout', 'Optical', 'Standard', 'Periodic',
            'Optical Instrument', (today - timedelta(days=700)).strftime('%Y-%m-%d'), 'Accept',
            'Telecentric illumination optical system.', 12,
            (today - timedelta(days=45)).strftime('%Y-%m-%d'), (today + timedelta(days=320)).strftime('%Y-%m-%d'),
            'dwg_profile_projector.svg', 'Optical Projector Stage & Chart Spec'
        ),
        (
            'G21-11-042', 'G21-11-042', 'Snap Gauge', '40h7 Go/No-Go (-0.025mm)', '0.001mm',
            'BAK-SG-40', 'SN-552910', 'Machining', 'Grinding Cell 4', 'Stand G', 'C-Snap 40',
            'India', 'Shaft Outside Diameter', 'Mechanical', 'Comparative', 'Working', 'Periodic',
            'Snap Gauge', (today - timedelta(days=310)).strftime('%Y-%m-%d'), 'Accept',
            'Tungsten carbide tipped anvils.', 6,
            (today - timedelta(days=180)).strftime('%Y-%m-%d'), (today + timedelta(days=2)).strftime('%Y-%m-%d'),
            'dwg_snap_gauge.svg', 'Double Ended Snap Gauge Drawing'
        ),
        (
            'G21-12-007', 'G21-12-007', 'Master Gauge Block Set (88 Pcs)', '0.5mm - 100mm Grade 0', '0.0001mm',
            'MIT-516-962', 'SN-001293', 'Quality Assurance', 'Standards Room', 'Safe Cabinet 01', 'Ceramic M88',
            'Japan', 'Length Reference Standard', 'Direct Blocks', 'Direct', 'Reference', 'Periodic',
            'Gauge Blocks', (today - timedelta(days=600)).strftime('%Y-%m-%d'), 'Accept',
            'Primary reference master set for plant calibration transfer.', 24,
            (today - timedelta(days=300)).strftime('%Y-%m-%d'), (today + timedelta(days=430)).strftime('%Y-%m-%d'),
            'dwg_gauge_blocks.svg', 'Gauge Block Calibration Layout'
        ),
        (
            'G21-10-019', 'G21-10-019', 'Depth Micrometer', '0-100mm Interchangeable Rods', '0.01mm',
            'MIT-129-115', 'SN-783210', 'Machining', 'Machine Shop Line 3', 'Tool Tray 1', 'Series 129',
            'Japan', 'Step / Groove Depth', 'Mechanical Vernier', 'Direct', 'Working', 'Periodic',
            'Micrometer', (today - timedelta(days=150)).strftime('%Y-%m-%d'), 'Accept',
            'Includes 4 interchangeable hardened rods.', 12,
            (today - timedelta(days=360)).strftime('%Y-%m-%d'), (today + timedelta(days=5)).strftime('%Y-%m-%d'),
            'dwg_depth_micrometer.svg', 'Depth Micrometer Rod Configuration'
        ),
        (
            'G21-13-004', 'G21-13-004', 'Dial Bore Depth Gauge', '0-50mm / 0.01mm', '0.01mm',
            'ACC-DBG-50', 'SN-901823', 'Tool Room', 'Tool Room Inspection', 'Shelf 3', 'DBG-50',
            'India', 'Blind Hole Depth', 'Dial', 'Comparative', 'Working', 'Periodic',
            'Dial Gauge', (today - timedelta(days=190)).strftime('%Y-%m-%d'), 'Scrap',
            'Spindle bent beyond repair during line drop. Decommissioned.', 12,
            (today - timedelta(days=420)).strftime('%Y-%m-%d'), (today - timedelta(days=55)).strftime('%Y-%m-%d'),
            'dwg_depth_gauge.svg', 'Dial Depth Gauge Decommission Record'
        )
    ]

    cur.executemany("""
        INSERT INTO gauges (
            nws_gauge_no, gauge_no, description, specification, least_count,
            mfg_no, mfg_sno, keeping_dept, location, placement, model,
            country, measurement, display, method, gauge_type, basis,
            category, received_date, status, note, cal_cycle_months,
            last_cal_date, next_due_date, drawing_file, drawing_title
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, sample_gauges)

    # Add calibration logs
    logs = [
        # Gauge 1 (Surface plate)
        (1, (today - timedelta(days=30)).strftime('%Y-%m-%d'), (today - timedelta(days=28)).strftime('%Y-%m-%d %H:%M:%S'),
         (today - timedelta(days=25)).strftime('%Y-%m-%d %H:%M:%S'), (today - timedelta(days=20)).strftime('%Y-%m-%d %H:%M:%S'),
         'Completed', 'Jaya Gopal', 192.0, 'Calibrated using Electronic Level & Bridge. Flatness within 3.2 um (Grade 0 tolerance).',
         'NABL/CAL/2026/1029', 'NABL Accredited Metrology Lab', 'Pass'),

        # Gauge 2 (Micrometer)
        (2, (today - timedelta(days=170)).strftime('%Y-%m-%d'), (today - timedelta(days=165)).strftime('%Y-%m-%d %H:%M:%S'),
         (today - timedelta(days=162)).strftime('%Y-%m-%d %H:%M:%S'), (today - timedelta(days=160)).strftime('%Y-%m-%d %H:%M:%S'),
         'Completed', 'Jaya Gopal', 120.0, 'Zero error verified. Anvil parallelism checked with optical flats (0.6 um).',
         'PQE/CAL/26/0411', 'Internal Plant Gauge Room', 'Pass'),

        # Gauge 3 (Vernier Caliper) - In Calibration Room / Sent
        (3, today.strftime('%Y-%m-%d'), (today - timedelta(days=2)).strftime('%Y-%m-%d 10:15:00'),
         (today - timedelta(days=1)).strftime('%Y-%m-%d 14:30:00'), None,
         'Received', 'Suresh Babu', None, 'Received in calibration room. Temperature soaking underway before reading.',
         None, 'Internal Plant Gauge Room', 'In-Progress'),

        # Gauge 4 (Dial indicator) - Sent
        (4, today.strftime('%Y-%m-%d'), (today - timedelta(days=1)).strftime('%Y-%m-%d 09:30:00'),
         None, None,
         'Sent', 'Ramesh Kumar', None, 'Dispatched to calibration room for periodic 6-month recalibration.',
         None, 'Internal Plant Gauge Room', 'In-Progress'),

        # Gauge 6 (Thread Plug Gauge) - Overdue / Pending
        (6, (today - timedelta(days=15)).strftime('%Y-%m-%d'), None, None, None,
         'Pending', 'Jaya Gopal', None, 'Scheduled for October calibration. Production line request to expedite.',
         None, 'Internal Plant Gauge Room', 'Pending'),

        # Gauge 7 (Plain Plug Gauge) - Overdue / Sent
        (7, (today - timedelta(days=10)).strftime('%Y-%m-%d'), (today - timedelta(days=4)).strftime('%Y-%m-%d 11:00:00'),
         None, None,
         'Sent', 'Jaya Gopal', None, 'Dispatched to External Standards Lab for 3-wire pitch check.',
         None, 'National Calibration Services', 'In-Progress'),

        # Gauge 9 (Torque Wrench) - Completed
        (9, (today - timedelta(days=365)).strftime('%Y-%m-%d'), (today - timedelta(days=360)).strftime('%Y-%m-%d 08:30:00'),
         (today - timedelta(days=357)).strftime('%Y-%m-%d 16:00:00'), (today - timedelta(days=355)).strftime('%Y-%m-%d 17:30:00'),
         'Completed', 'Ramesh Kumar', 121.5, 'Calibrated on Norbar Torque Tester. Deviation at 20, 50, 100 Nm within +/- 2.5%.',
         'TW-CERT-2025-884', 'Internal Plant Gauge Room', 'Pass'),

        # Gauge 11 (Coating thickness) - Rejected / Sent for repair
        (11, (today - timedelta(days=25)).strftime('%Y-%m-%d'), (today - timedelta(days=22)).strftime('%Y-%m-%d 09:00:00'),
         (today - timedelta(days=20)).strftime('%Y-%m-%d 15:00:00'), (today - timedelta(days=18)).strftime('%Y-%m-%d 12:00:00'),
         'Rejected', 'Jaya Gopal', 99.0, 'Probe failed zero-shimming test on ferrous substrate. Unstable readings. Transferred to repair.',
         'REJ-2026-019', 'Internal Plant Gauge Room', 'Fail')
    ]

    cur.executemany("""
        INSERT INTO calibration_logs (
            gauge_id, plan_date, sent_date, received_date, completed_date,
            status, calibrated_by, time_diff_hours, remarks, certificate_no, agency, result
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, logs)

    # Add technical drawings / specs
    drawings = [
        (1, 'DWG-GMS-001', 'Granite Surface Plate Flatness Profile', 'Rev 3.0', 'dwg_surface_plate.svg',
         'Diagonal repeat reading method as per IS 7327. Permissible deviation: 3.5 microns across diagonal.',
         '{"length": "630mm", "width": "630mm", "height": "100mm", "grade": "0", "material": "Black Granite"}',
         'Jaya Gopal'),
        (2, 'DWG-GMS-002', 'QuantuMike 0-25mm Spindle & Anvil Diagram', 'Rev 2.1', 'dwg_micrometer.svg',
         'Spindle face carbide tip diameter 6.5mm. Flatness <= 0.3um. Parallelism <= 1.0um.',
         '{"range": "0-25mm", "resolution": "0.001mm", "thimble_dia": "18mm", "ratchet": "Friction Thimble"}',
         'Jaya Gopal'),
        (3, 'DWG-GMS-003', 'Vernier Caliper Jaws Internal & External Clearance', 'Rev 1.4', 'dwg_caliper.svg',
         'Main beam thickness 3.8mm. Inside nib jaw width 10.00mm. Depth bar 1.6 x 3.0mm.',
         '{"total_length": "235mm", "jaw_depth": "40mm", "inside_jaw": "16mm", "beam_width": "16mm"}',
         'Ramesh Kumar'),
        (4, 'DWG-GMS-004', 'Plunger Dial Indicator Movement & Back Lug Blueprint', 'Rev 2.0', 'dwg_dial_gauge.svg',
         'Spindle travel 10mm. Bezel diameter 58mm. Stem diameter 8.00mm h6 tolerance.',
         '{"dial_dia": "58mm", "stem_dia": "8mm h6", "lug_hole": "6.5mm", "travel": "10mm"}',
         'Suresh Babu'),
        (6, 'DWG-GMS-006', 'M12 x 1.75 6H Thread Plug Gauge Pitch Spec', 'Rev 4.0', 'dwg_thread_plug.svg',
         'Major diameter Go: 12.000 +0.015 / No-Go: 11.830 -0.012. Pitch diameter Go: 10.863.',
         '{"nominal": "M12", "pitch": "1.75mm", "class": "6H", "go_length": "22mm", "nogo_length": "14mm"}',
         'Jaya Gopal'),
        (9, 'DWG-GMS-009', 'Torque Wrench 20-100 Nm Lever Geometry', 'Rev 1.2', 'dwg_torque_wrench.svg',
         'Pivot center to handle grip center: 360mm. Ratchet drive: 1/2 inch square drive.',
         '{"square_drive": "1/2 inch", "lever_length": "360mm", "barrel_dia": "28mm", "range": "20-100 Nm"}',
         'Ramesh Kumar')
    ]

    cur.executemany("""
        INSERT INTO drawings (
            gauge_id, doc_number, title, revision, file_path, spec_notes, dimensions, uploaded_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, drawings)

    conn.commit()
    conn.close()
    print("Database successfully seeded with realistic industrial gauge data!")

if __name__ == '__main__':
    seed()
