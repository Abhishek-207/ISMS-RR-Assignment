import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Organization } from './models/Organization.model.js';
import { User } from './models/User.model.js';
import { MaterialCategory, MaterialStatus } from './models/Masters.model.js';
import { Material } from './models/Material.model.js';
import { TransferRequest } from './models/TransferRequest.model.js';

dotenv.config();

// Updated to seed data for the requested organization & user
const ORGANIZATION_ID = '6940fc679f9611543ec9a9c9';
const USER_ID = '6940fc689f9611543ec9a9cb';
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
        name: 'Rural Handicrafts & Materials Cooperative Ltd.',
        category: ORGANIZATION_CATEGORY,
        description:
          'Premier cooperative managing traditional Indian handicraft materials, handloom fabrics, natural dyes, and artisan supplies across rural India',
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
        name: 'Priya Mehta',
        email: 'priya.mehta@ruralhandicrafts.in',
        passwordHash,
        role: 'ORG_ADMIN',
        isActive: true,
      });
    }

    // Create Material Categories (10 categories) - focused on Indian handicrafts and traditional materials
    console.log('Creating Material Categories...');
    const categories = [
      { name: 'Handloom Cotton Fabrics', description: 'Traditional handwoven cotton fabrics from various Indian states like Khadi, Kalamkari, and Ikat' },
      { name: 'Silk & Silk Blends', description: 'Pure silk, tussar silk, and silk-cotton blends from Karnataka, West Bengal, and Bihar' },
      { name: 'Natural Dyes & Pigments', description: 'Traditional Indian natural dyes like indigo, turmeric, madder root, and pomegranate peel' },
      { name: 'Hand Embroidery Threads', description: 'Zari threads, silk threads, and cotton threads for traditional embroidery work' },
      { name: 'Bamboo & Cane Materials', description: 'Bamboo strips, cane reeds, and natural fibers for basket weaving and handicrafts' },
      { name: 'Clay & Pottery Supplies', description: 'Terracotta clay, glazing materials, and pottery tools for traditional ceramic work' },
      { name: 'Wood Carving Materials', description: 'Sandalwood, teak, rosewood, and carving tools for traditional Indian woodwork' },
      { name: 'Metal Craft Supplies', description: 'Brass, copper, silver sheets, and traditional metalworking tools for Indian metal crafts' },
      { name: 'Jute & Coir Products', description: 'Jute fibers, coir yarn, and natural jute products for eco-friendly handicrafts' },
      { name: 'Traditional Beads & Stones', description: 'Rudraksha beads, semi-precious stones, glass beads, and traditional jewelry materials' },
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
      'Available in Stock',
      'Low Inventory',
      'Quality Inspection Pending',
      'Ready for Distribution',
      'Currently in Use',
      'Reserved for Artisan',
      'Requires Restoration',
      'Partially Damaged',
      'Surplus Stock Available',
      'Seasonal Item'
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

    // Create Materials (10 materials with Indian handicraft and traditional material context)
    console.log('\nCreating Materials...');
    const materials = [
      {
        name: 'Kalamkari Handloom Cotton - Andhra Pradesh',
        categoryId: createdCategories[0]._id,
        quantity: 850,
        unit: 'meters',
        condition: 'NEW',
        isSurplus: true,
        estimatedCost: 450,
        notes:
          'Traditional hand-painted Kalamkari cotton fabric from Machilipatnam, Andhra Pradesh. Natural dyes used, perfect for traditional garments and home decor.',
      },
      {
        name: 'Tussar Silk Rolls - Jharkhand',
        categoryId: createdCategories[1]._id,
        quantity: 320,
        unit: 'meters',
        condition: 'GOOD',
        isSurplus: true,
        estimatedCost: 1200,
        notes:
          'Pure tussar silk from Jharkhand tribal weavers. Natural golden color, handwoven, suitable for sarees and traditional wear. Limited surplus stock.',
      },
      {
        name: 'Natural Indigo Dye Powder - Tamil Nadu',
        categoryId: createdCategories[2]._id,
        quantity: 150,
        unit: 'kg',
        condition: 'NEW',
        isSurplus: true,
        estimatedCost: 850,
        notes:
          'Organic indigo dye powder sourced from traditional dyers in Tamil Nadu. Pure natural indigo, no synthetic additives. Ideal for traditional textile dyeing.',
      },
      {
        name: 'Zari Embroidery Threads - Surat',
        categoryId: createdCategories[3]._id,
        quantity: 280,
        unit: 'spools',
        condition: 'GOOD',
        isSurplus: false,
        estimatedCost: 320,
        notes:
          'Traditional zari threads from Surat, Gujarat. Gold and silver zari threads for intricate embroidery work on sarees and traditional garments.',
      },
      {
        name: 'Bamboo Strips for Weaving - Assam',
        categoryId: createdCategories[4]._id,
        quantity: 1200,
        unit: 'strips',
        condition: 'NEW',
        isSurplus: true,
        estimatedCost: 180,
        notes:
          'Premium bamboo strips from Assam, treated and ready for basket weaving and traditional handicraft work. Sustainable and eco-friendly material.',
      },
      {
        name: 'Terracotta Clay - Khurja',
        categoryId: createdCategories[5]._id,
        quantity: 800,
        unit: 'kg',
        condition: 'GOOD',
        isSurplus: false,
        estimatedCost: 95,
        notes:
          'Fine terracotta clay from Khurja, Uttar Pradesh. Traditional pottery clay suitable for hand-molded and wheel-thrown ceramics. Well-aged and ready to use.',
      },
      {
        name: 'Sandalwood Blocks - Karnataka',
        categoryId: createdCategories[6]._id,
        quantity: 45,
        unit: 'blocks',
        condition: 'NEW',
        isSurplus: true,
        estimatedCost: 2500,
        notes:
          'Premium sandalwood blocks from Mysore, Karnataka. A-grade quality for traditional wood carving and handicraft work. Natural fragrance preserved.',
      },
      {
        name: 'Brass Sheets for Metalwork - Moradabad',
        categoryId: createdCategories[7]._id,
        quantity: 220,
        unit: 'sheets',
        condition: 'GOOD',
        isSurplus: false,
        estimatedCost: 680,
        notes:
          'Traditional brass sheets from Moradabad, Uttar Pradesh. Suitable for handcrafted brass items, utensils, and decorative pieces. Various thicknesses available.',
      },
      {
        name: 'Jute Yarn & Fibers - West Bengal',
        categoryId: createdCategories[8]._id,
        quantity: 650,
        unit: 'kg',
        condition: 'NEW',
        isSurplus: true,
        estimatedCost: 140,
        notes:
          'Natural jute yarn and fibers from West Bengal. Eco-friendly material for bags, mats, and traditional handicrafts. Biodegradable and sustainable.',
      },
      {
        name: 'Rudraksha Beads & Semi-Precious Stones - Varanasi',
        categoryId: createdCategories[9]._id,
        quantity: 1800,
        unit: 'pieces',
        condition: 'GOOD',
        isSurplus: true,
        estimatedCost: 420,
        notes:
          'Authentic Rudraksha beads and semi-precious stones from Varanasi. Traditional materials for jewelry making, mala beads, and spiritual handicrafts.',
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

    // Create other organizations for transfer requests (Indian handicraft and traditional craft ecosystem)
    console.log('\nCreating additional organizations for transfers...');
    const otherOrgs = [
      { name: 'Kalamkari Artisan Cooperative - Machilipatnam', category: 'MANUFACTURING_CLUSTER' },
      { name: 'Jharkhand Tribal Handloom Society', category: 'MANUFACTURING_CLUSTER' },
      { name: 'Tamil Nadu Natural Dyeing Center', category: 'MANUFACTURING_CLUSTER' },
      { name: 'National Institute of Fashion Technology - Delhi', category: 'EDUCATIONAL_INSTITUTION' },
      { name: 'Crafts Council of India', category: 'INFRASTRUCTURE_CONSTRUCTION' },
      { name: 'Assam Bamboo Craft Development Society', category: 'MANUFACTURING_CLUSTER' },
      { name: 'Khurja Pottery Artisan Guild', category: 'MANUFACTURING_CLUSTER' },
      { name: 'Mysore Sandalwood Carving Association', category: 'MANUFACTURING_CLUSTER' },
      { name: 'Moradabad Brass Craft Training Institute', category: 'EDUCATIONAL_INSTITUTION' },
      { name: 'West Bengal Jute Products Cooperative', category: 'MANUFACTURING_CLUSTER' },
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
      'Kalamkari fabric supply for traditional garment production at Machilipatnam cooperative',
      'Tussar silk allocation to Jharkhand tribal weavers for traditional saree making',
      'Natural indigo dye distribution to Tamil Nadu dyers for traditional textile dyeing workshop',
      'Zari thread supply to NIFT Delhi for traditional embroidery design course',
      'Bamboo strips transfer to Assam craft society for traditional basket weaving training',
      'Terracotta clay supply to Khurja pottery guild for traditional ceramic workshop',
      'Sandalwood blocks allocation to Mysore carving association for traditional woodwork training',
      'Brass sheets transfer to Moradabad training institute for traditional metal craft education',
      'Jute fibers supply to West Bengal cooperative for eco-friendly handicraft production',
      'Rudraksha beads and stones transfer to Varanasi artisans for traditional jewelry making',
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
          comment: 'Request approved. Traditional material quality verified and ready for dispatch to artisan community.',
          createdAt: transferData.approvedAt,
          createdBy: new mongoose.Types.ObjectId(USER_ID),
          type: 'APPROVAL'
        });
      }

      if (status === 'COMPLETED') {
        transferData.completedAt = new Date(now.getTime() - (8 - i) * 24 * 60 * 60 * 1000);
        comments.push({
          comment: 'Transfer completed successfully. Traditional handicraft material received in excellent condition by artisan group.',
          createdAt: transferData.completedAt,
          createdBy: new mongoose.Types.ObjectId(USER_ID),
          type: 'COMPLETION'
        });
      }

      if (status === 'REJECTED') {
        comments.push({
          comment: 'Request rejected due to limited traditional material stock availability. Will prioritize in next procurement cycle.',
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
    console.log(`   • Organization: Rural Handicrafts & Materials Cooperative Ltd. (ENTERPRISE)`);
    console.log(`   • User: Priya Mehta (ORG_ADMIN)`);
    console.log(`   • Material Categories: 10`);
    console.log(`   • Material Statuses: 10`);
    console.log(`   • Materials: 10 (with Indian handicraft and traditional material context)`);
    console.log(`   • Partner Organizations: 10`);
    console.log(`   • Transfer Requests: 10`);
    console.log(`\n🔑 Login Credentials:`);
    console.log(`   Email: priya.mehta@ruralhandicrafts.in`);
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
