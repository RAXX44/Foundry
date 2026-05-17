/**
 * Seed Script Generator
 * Generates Prisma seed scripts with faker data
 */

import type { ValidatedERDAST, ERDTable, ERDField } from '@/types/erd';
import { toCamelCase } from '@/lib/utils/string';

/**
 * Map field name to appropriate faker method
 */
function mapFieldToFaker(field: ERDField): string {
  const name = field.name.toLowerCase();
  const type = field.type;

  // String fields
  if (type === 'String') {
    if (name.includes('email')) return 'faker.internet.email()';
    if (name.includes('name') || name.includes('firstname')) return 'faker.person.fullName()';
    if (name.includes('lastname')) return 'faker.person.lastName()';
    if (name.includes('title')) return 'faker.lorem.sentence()';
    if (name.includes('description') || name.includes('content') || name.includes('bio')) return 'faker.lorem.paragraph()';
    if (name.includes('phone')) return 'faker.phone.number()';
    if (name.includes('address')) return 'faker.location.streetAddress()';
    if (name.includes('city')) return 'faker.location.city()';
    if (name.includes('country')) return 'faker.location.country()';
    if (name.includes('url') || name.includes('website')) return 'faker.internet.url()';
    if (name.includes('username')) return 'faker.internet.userName()';
    if (name.includes('company')) return 'faker.company.name()';
    if (name.includes('job') || name.includes('position')) return 'faker.person.jobTitle()';
    return 'faker.lorem.word()';
  }

  // Number fields
  if (type === 'Int' || type === 'Float') {
    if (name.includes('age')) return 'faker.number.int({ min: 18, max: 80 })';
    if (name.includes('price') || name.includes('amount') || name.includes('cost')) return 'parseFloat(faker.commerce.price())';
    if (name.includes('score') || name.includes('rating')) return 'faker.number.int({ min: 0, max: 100 })';
    if (name.includes('quantity') || name.includes('count')) return 'faker.number.int({ min: 1, max: 100 })';
    return 'faker.number.int({ min: 1, max: 1000 })';
  }

  // Boolean fields
  if (type === 'Boolean') {
    return 'faker.datatype.boolean()';
  }

  // DateTime fields
  if (type === 'DateTime') {
    if (name.includes('birth')) return 'faker.date.birthdate()';
    if (name.includes('future')) return 'faker.date.future()';
    return 'faker.date.past()';
  }

  return 'faker.lorem.word()';
}

/**
 * Generate seed data for a single model
 */
function generateModelSeed(table: ERDTable, relations: ValidatedERDAST['relations']): string {
  const modelName = table.name;
  const modelVar = toCamelCase(modelName);
  const modelVarPlural = `${modelVar}s`;

  // Filter out FK fields and system fields
  const userFields = table.fields.filter(
    f => !f.name.endsWith('Id') && 
         f.name !== 'id' && 
         f.name !== 'createdAt' && 
         f.name !== 'updatedAt'
  );

  // Generate field assignments
  const fieldAssignments = userFields.map(field => {
    const fakerCall = mapFieldToFaker(field);
    return `        ${field.name}: ${fakerCall}`;
  }).join(',\n');

  return `  // Create 10 ${modelName} records
  console.log('Seeding ${modelName}...');
  const ${modelVarPlural} = [];
  for (let i = 0; i < 10; i++) {
    const ${modelVar} = await prisma.${modelVar}.create({
      data: {
${fieldAssignments}
      }
    });
    ${modelVarPlural}.push(${modelVar});
  }
  console.log(\`Created \${${modelVarPlural}.length} ${modelName} records\`);
`;
}

/**
 * Generate complete seed script
 */
export function generateSeedScript(ast: ValidatedERDAST): string {
  const sections: string[] = [];

  // Add imports
  sections.push(`import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');
  console.log('');
`);

  // Generate seed for each model
  for (const table of ast.tables) {
    sections.push(generateModelSeed(table, ast.relations));
  }

  // Add completion message
  sections.push(`  console.log('');
  console.log('✅ Database seeded successfully!');
}

main()
  .catch((error) => {
    console.error('Error seeding database:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
`);

  return sections.join('\n');
}

// Made with Bob
