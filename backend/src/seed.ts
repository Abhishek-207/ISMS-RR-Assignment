import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Organization } from './models/Organization.model.js';
import { User } from './models/User.model.js';
import { MaterialCategory, MaterialStatus } from './models/Masters.model.js';
import { Material } from './models/Material.model.js';
import { TransferRequest } from './models/TransferRequest.model.js';

dotenv.config();

// Updated to seed data for the requested organization & user
const ORGANIZATION_ID = '694059d538fa32f0bb2601bc';
const USER_ID = '694059d538fa32f0bb2601be';
const ORGANIZATION_CATEGORY = 'ENTERPRISE';

async function seedDatabase() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Clear existing data for this organization
    console.log('Clearing existing data...');
    await Material.deleteMany({ organizationId: ORGANIZATION_ID });
    await TransferRequest.deleteMany({ organizationId: ORGANIZATION_ID });
    await MaterialCategory.deleteMany({ organizationId: ORGANIZATION_ID });
    await MaterialStatus.deleteMany({ organizationId: ORGANIZATION_ID });
    console.log('Existing data cleared');

    // Verify Organization and User exist
    const org = await Organization.findById(ORGANIZATION_ID);
    const user = await User.findById(USER_ID);
    
    if (!org) {
      console.log('Organization not found, creating...');
      await Organization.create({
        _id: new mongoose.Types.ObjectId(ORGANIZATION_ID),
        name: 'Enterprise Cut Area India Pvt. Ltd.',
        category: ORGANIZATION_CATEGORY,
        description:
          'Integrated garment and textile cutting enterprise managing surplus fabrics, trims, and production offcuts across Indian manufacturing hubs',
        isActive: true,
      });
    }

    if (!user) {
      console.log('User not found, creating...');
      const bcrypt = await import('bcryptjs');
      const passwordHash = await bcrypt.hash('Password123!', 10);
      await User.create({
        _id: new mongoose.Types.ObjectId(USER_ID),
        organizationId: ORGANIZATION_ID,
        organizationCategory: ORGANIZATION_CATEGORY,
        name: 'Anita Sharma',
        email: 'anita.sharma@enterprisecutarea.in',
        passwordHash,
        role: 'ORG_ADMIN',
        isActive: true,
      });
    }

    // Create Material Categories (10 categories) - focused on garment / textile cutting operations in India
    console.log('Creating Material Categories...');
    const categories = [
      { name: 'Knitted Fabric Rolls', description: 'Single jersey, interlock and rib fabrics used for T-shirts and knitwear' },
      { name: 'Woven Fabric Rolls', description: 'Shirting, suiting and denim fabrics for bulk cutting' },
      { name: 'Cut Panels & Offcuts', description: 'Pre-cut garment panels and surplus cutting waste' },
      { name: 'Trims & Accessories', description: 'Labels, elastic, zippers, drawcords and other garment trims' },
      { name: 'Lining & Fusing', description: 'Interlinings, fusing and pocketing materials' },
      { name: 'Packing Material', description: 'Cartons, polybags, hangers and tagging material' },
      { name: 'Safety & Compliance', description: 'PPE, safety gear and compliance-related consumables' },
      { name: 'Industrial Sewing Inputs', description: 'Threads, needles and machine-specific consumables' },
      { name: 'Sampling & Development', description: 'Small lot fabrics and trims kept for sampling & R&D' },
      { name: 'Recyclable Textile Waste', description: 'Sorted textile waste suitable for recycling and upcycling' },
    ];

    const createdCategories = [];
    for (const cat of categories) {
      const category = await MaterialCategory.create({
        organizationId: ORGANIZATION_ID,
        name: cat.name,
        isActive: true
      });
      createdCategories.push(category);
      console.log(`  ✓ Created category: ${cat.name}`);
    }

    // Create Material Statuses (10 statuses)
    console.log('\nCreating Material Statuses...');
    const statuses = [
      'In Stock',
      'Low Stock',
      'Awaiting Quality Check',
      'Ready for Dispatch',
      'Under Processing',
      'Reserved for Order',
      'Needs Repair',
      'Damaged - Salvageable',
      'Surplus - Available',
      'Discontinued'
    ];

    const createdStatuses = [];
    for (const status of statuses) {
      const materialStatus = await MaterialStatus.create({
        organizationId: ORGANIZATION_ID,
        name: status,
        isActive: true
      });
      createdStatuses.push(materialStatus);
      console.log(`  ✓ Created status: ${status}`);
    }

    // Create Materials (10 materials with Indian enterprise cut area context)
    console.log('\nCreating Materials...');
    const materials = [
      {
        name: 'Single Jersey Cotton Rolls - Tiruppur',
        categoryId: createdCategories[0]._id,
        quantity: 1200,
        unit: 'meters',
        condition: 'NEW',
        isSurplus: true,
        estimatedCost: 290,
        notes:
          'Combed cotton single jersey, 180 GSM, reactive dyed. Surplus from export order to EU buyer, stored in Tiruppur unit.',
      },
      {
        name: 'Denim Fabric Rolls - Ahmedabad Mill',
        categoryId: createdCategories[1]._id,
        quantity: 850,
        unit: 'meters',
        condition: 'GOOD',
        isSurplus: true,
        estimatedCost: 420,
        notes:
          '12 oz stretch denim, indigo dyed, mill surplus from Ahmedabad cluster. Slight shade variation between lots.',
      },
      {
        name: 'Men’s Shirt Panels - Bengaluru Cutting',
        categoryId: createdCategories[2]._id,
        quantity: 650,
        unit: 'sets',
        condition: 'NEW',
        isSurplus: true,
        estimatedCost: 155,
        notes:
          'Full cut panels (front, back, sleeves, collar, cuff) for mens formal shirts. Balance quantity after style change.',
      },
      {
        name: 'Elastic & Drawcord Assortment',
        categoryId: createdCategories[3]._id,
        quantity: 500,
        unit: 'kg',
        condition: 'GOOD',
        isSurplus: false,
        estimatedCost: 380,
        notes:
          'Assorted knitted elastic, flat elastic and cotton drawcords used in joggers and sportswear. Mixed colours and widths.',
      },
      {
        name: 'Fusible Interlining Rolls',
        categoryId: createdCategories[4]._id,
        quantity: 400,
        unit: 'meters',
        condition: 'NEW',
        isSurplus: true,
        estimatedCost: 95,
        notes:
          'Non-woven fusible interlining suitable for shirt collars and plackets. Surplus due to buyer spec change.',
      },
      {
        name: 'Corrugated Cartons - Export Grade',
        categoryId: createdCategories[5]._id,
        quantity: 900,
        unit: 'pieces',
        condition: 'GOOD',
        isSurplus: false,
        estimatedCost: 55,
        notes:
          '5-ply export quality cartons with generic print. Over-ordered for cancelled US buyer shipment.',
      },
      {
        name: 'Polyester Sewing Thread Cones',
        categoryId: createdCategories[6]._id,
        quantity: 1100,
        unit: 'cones',
        condition: 'NEW',
        isSurplus: true,
        estimatedCost: 32,
        notes:
          '40/2 polyester sewing thread cones in core export colours. Balance stock kept for repeat orders, now surplus.',
      },
      {
        name: 'Hi-Vis Safety Vests & Helmets',
        categoryId: createdCategories[7]._id,
        quantity: 250,
        unit: 'sets',
        condition: 'GOOD',
        isSurplus: false,
        estimatedCost: 620,
        notes:
          'Safety vests, helmets and basic PPE used in cutting and finishing sections. Extra stock after compliance audit.',
      },
      {
        name: 'Sample Lengths - Printed Rayon',
        categoryId: createdCategories[8]._id,
        quantity: 320,
        unit: 'meters',
        condition: 'NEW',
        isSurplus: true,
        estimatedCost: 210,
        notes:
          'Assorted printed rayon sample lots from Jaipur printers, used for style development and fit samples.',
      },
      {
        name: 'Sorted Knits for Recycling',
        categoryId: createdCategories[9]._id,
        quantity: 1500,
        unit: 'kg',
        condition: 'GOOD',
        isSurplus: true,
        estimatedCost: 65,
        notes:
          'Colour and fibre-wise sorted knit waste from Tiruppur and Bengaluru units, suitable for open-end recycling.',
      },
    ];

    const createdMaterials = [];
    const now = new Date();
    const availableFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const availableUntil = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000); // 180 days from now

    for (let i = 0; i < materials.length; i++) {
      const mat = materials[i];
      const material = await Material.create({
        organizationId: ORGANIZATION_ID,
        name: mat.name,
        categoryId: mat.categoryId,
        quantity: mat.quantity,
        unit: mat.unit,
        status: i % 3 === 0 ? 'AVAILABLE' : i % 3 === 1 ? 'RESERVED' : 'AVAILABLE',
        materialStatusId: createdStatuses[i]._id,
        condition: mat.condition,
        isSurplus: mat.isSurplus,
        availableFrom,
        availableUntil,
        notes: mat.notes,
        estimatedCost: mat.estimatedCost,
        attachments: [],
        allocationHistory: [],
        createdBy: USER_ID,
        updatedBy: USER_ID
      });
      createdMaterials.push(material);
      console.log(`  ✓ Created material: ${mat.name} (${mat.quantity} ${mat.unit})`);
    }

    // Create other organizations for transfer requests (Indian garment / textile ecosystem)
    console.log('\nCreating additional organizations for transfers...');
    const otherOrgs = [
      { name: 'Tiruppur Knitwear Cluster Association', category: 'MANUFACTURING_CLUSTER' },
      { name: 'Bengaluru Apparel Park Trust', category: 'MANUFACTURING_CLUSTER' },
      { name: 'Noida Export Garment Hub', category: 'MANUFACTURING_CLUSTER' },
      { name: 'NIFT Bengaluru Campus', category: 'EDUCATIONAL_INSTITUTION' },
      { name: 'Textile Committee of India', category: 'INFRASTRUCTURE_CONSTRUCTION' },
      { name: 'Surat Powerloom Development Society', category: 'MANUFACTURING_CLUSTER' },
      { name: 'Mumbai Port Logistics & Warehousing', category: 'ENTERPRISE' },
      { name: 'Gurugram Buying Office Consortium', category: 'MANUFACTURING_CLUSTER' },
      { name: 'Ahmedabad Textile Research Center', category: 'EDUCATIONAL_INSTITUTION' },
      { name: 'Pan-India Textile Recycling Mission', category: 'INFRASTRUCTURE_CONSTRUCTION' },
    ];

    const createdOrgs = [];
    for (const org of otherOrgs) {
      const existingOrg = await Organization.findOne({ name: org.name });
      if (existingOrg) {
        createdOrgs.push(existingOrg);
      } else {
        const newOrg = await Organization.create({
          name: org.name,
          category: org.category,
          description: `Partner organization for rural handicraft development in ${org.name.split(' ')[0]}`,
          isActive: true
        });
        createdOrgs.push(newOrg);
        console.log(`  ✓ Created organization: ${org.name}`);
      }
    }

    // Create Transfer Requests (10 requests)
    console.log('\nCreating Transfer Requests...');
    const transferPurposes = [
      'Balancing knit fabric requirement for urgent export order in Tiruppur cluster',
      'Reallocation of denim rolls to Bengaluru unit for fast fashion program',
      'Supply of ready cut shirt panels for subcontracting unit in Noida',
      'Trims transfer to NIFT Bengaluru for industrial training program',
      'Interlining requirement for buyer compliance sampling at Textile Committee',
      'Carton and packing material support for Surat cluster shipment surge',
      'Thread and consumables dispatch to Mumbai port consolidation warehouse',
      'Safety gear deployment to Gurugram buying office audit sites',
      'Sample fabric movement to Ahmedabad research center for testing',
      'Recyclable textile waste transfer to national recycling mission pilot',
    ];

    const statuses_transfer = ['PENDING', 'APPROVED', 'COMPLETED', 'PENDING', 'APPROVED', 'REJECTED', 'COMPLETED', 'PENDING', 'APPROVED', 'COMPLETED'];

    for (let i = 0; i < 10; i++) {
      const material = createdMaterials[i];
      const toOrg = createdOrgs[i];
      const status = statuses_transfer[i];
      const quantityRequested = Math.floor(material.quantity * (0.2 + Math.random() * 0.3)); // 20-50% of available

      const comments: any[] = [{
        comment: transferPurposes[i],
        createdAt: new Date(now.getTime() - (10 - i) * 24 * 60 * 60 * 1000),
        createdBy: new mongoose.Types.ObjectId(USER_ID),
        type: 'REQUEST'
      }];

      const transferData: any = {
        organizationId: ORGANIZATION_ID,
        materialId: material._id,
        fromOrganizationId: ORGANIZATION_ID,
        toOrganizationId: toOrg._id,
        quantityRequested,
        purpose: transferPurposes[i],
        status,
        comments: [],
        requestedBy: USER_ID
      };

      if (status === 'APPROVED' || status === 'COMPLETED') {
        transferData.approvedBy = USER_ID;
        transferData.approvedAt = new Date(now.getTime() - (9 - i) * 24 * 60 * 60 * 1000);
        comments.push({
          comment: 'Request approved. Material quality verified and ready for dispatch.',
          createdAt: transferData.approvedAt,
          createdBy: new mongoose.Types.ObjectId(USER_ID),
          type: 'APPROVAL'
        });
      }

      if (status === 'COMPLETED') {
        transferData.completedAt = new Date(now.getTime() - (8 - i) * 24 * 60 * 60 * 1000);
        comments.push({
          comment: 'Transfer completed successfully. Material received in good condition.',
          createdAt: transferData.completedAt,
          createdBy: new mongoose.Types.ObjectId(USER_ID),
          type: 'COMPLETION'
        });
      }

      if (status === 'REJECTED') {
        comments.push({
          comment: 'Request rejected due to insufficient quantity available at this time.',
          createdAt: new Date(now.getTime() - (9 - i) * 24 * 60 * 60 * 1000),
          createdBy: new mongoose.Types.ObjectId(USER_ID),
          type: 'REJECTION'
        });
      }

      transferData.comments = comments;

      const transfer = await TransferRequest.create(transferData);
      console.log(`  ✓ Created transfer request: ${material.name} → ${toOrg.name} (${status})`);
    }

    console.log('\n✅ Database seeded successfully!');
    console.log('\n📊 Summary:');
    console.log(`   • Organization: Enterprise Cut Area India Pvt. Ltd. (ENTERPRISE)`);
    console.log(`   • User: Anita Sharma (ORG_ADMIN)`);
    console.log(`   • Material Categories: 10`);
    console.log(`   • Material Statuses: 10`);
    console.log(`   • Materials: 10 (with Indian handicraft context)`);
    console.log(`   • Partner Organizations: 10`);
    console.log(`   • Transfer Requests: 10`);
    console.log(`\n🔑 Login Credentials:`);
    console.log(`   Email: rajesh.kumar@ruralhandicrafts.in`);
    console.log(`   Password: Password123!`);

  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('\n✓ Database connection closed');
  }
}

seedDatabase();
