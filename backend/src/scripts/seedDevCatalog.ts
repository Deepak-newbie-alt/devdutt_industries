// Development-only sample catalog for building and checking the public website.
// Every row it creates has a slug starting with "sample-" and a name starting with "Sample".
// Prices and specifications are illustrative placeholders, not real product data.
//
//   npx tsc && node dist/scripts/seedDevCatalog.js            add or refresh the sample catalog
//   npx tsc && node dist/scripts/seedDevCatalog.js --remove   remove it again
import prisma from "../lib/prisma.js";
import type { Unit } from "../generated/prisma/enums.js";

type SampleProduct = {
    slug: string;
    name: string;
    description: string;
    price: string;
    unit: Unit;
    minimumOrderQuantity?: number;
    specifications: Record<string, string>;
    imageCount: number;
    brochure?: boolean;
};

type SampleCategory = {
    slug: string;
    name: string;
    description: string;
    displayOrder: number;
    products: SampleProduct[];
};

const SAMPLE_PREFIX = "sample-";

const catalog: SampleCategory[] = [
    {
        slug: "sample-pipe-bending-machines",
        name: "Sample Pipe Bending Machines",
        description: "Sample category for development: mechanical, hydraulic and CNC pipe benders.",
        displayOrder: 1,
        products: [
            {
                slug: "sample-mechanical-pipe-bending-machine",
                name: "Sample Mechanical Pipe Bending Machine",
                description: "Sample product for development. Gearbox-driven bender for mild steel and stainless pipes, with a manual angle stop.",
                price: "185000",
                unit: "Machine",
                specifications: {
                    "Pipe outer diameter": "12 – 51 mm",
                    "Maximum wall thickness": "2 mm",
                    "Bending angle": "Up to 180°",
                    "Motor": "3 HP, 3 phase",
                    "Machine weight": "450 kg"
                },
                imageCount: 3,
                brochure: true
            },
            {
                slug: "sample-hydraulic-pipe-bending-machine",
                name: "Sample Hydraulic Pipe Bending Machine",
                description: "Sample product for development. Hydraulic bender with a foot-operated control for repeat bends.",
                price: "265000",
                unit: "Machine",
                specifications: {
                    "Pipe outer diameter": "19 – 76 mm",
                    "Maximum wall thickness": "3 mm",
                    "Hydraulic pressure": "140 bar",
                    "Motor": "5 HP, 3 phase"
                },
                imageCount: 2
            },
            {
                slug: "sample-cnc-pipe-bending-machine",
                name: "Sample CNC Pipe Bending Machine",
                description: "Sample product for development. Programmable bender that stores bend sequences for production runs.",
                price: "850000",
                unit: "Machine",
                specifications: {
                    "Pipe outer diameter": "16 – 63 mm",
                    "Controlled axes": "3",
                    "Stored programs": "500",
                    "Bending accuracy": "±0.1°"
                },
                imageCount: 1,
                brochure: true
            }
        ]
    },
    {
        slug: "sample-end-forming-machines",
        name: "Sample End Forming Machines",
        description: "Sample category for development: tube expanding and end forming.",
        displayOrder: 2,
        products: [
            {
                slug: "sample-tube-expanding-machine",
                name: "Sample Tube Expanding Machine",
                description: "Sample product for development. Expands tube ends for socket joints.",
                price: "145000",
                unit: "Machine",
                specifications: {
                    "Tube outer diameter": "10 – 42 mm",
                    "Stroke": "120 mm",
                    "Motor": "2 HP"
                },
                imageCount: 0
            },
            {
                slug: "sample-hydraulic-end-forming-machine",
                name: "Sample Hydraulic End Forming Machine",
                description: "Sample product for development. Hydraulic end former with interchangeable dies.",
                price: "320000",
                unit: "Machine",
                specifications: {
                    "Tube outer diameter": "12 – 60 mm",
                    "Forming force": "20 tonne",
                    "Die stations": "2"
                },
                imageCount: 2
            }
        ]
    },
    {
        slug: "sample-pipe-notching-machines",
        name: "Sample Pipe Notching Machines",
        description: "Sample category for development: profile notching and mitering.",
        displayOrder: 3,
        products: [
            {
                slug: "sample-tube-profile-notching-machine",
                name: "Sample Tube Profile Notching Machine",
                description: "Sample product for development. Notches round tubes for saddle joints in fabrication work.",
                price: "100000",
                unit: "Machine",
                specifications: {
                    "Tube outer diameter": "20 – 76 mm",
                    "Notching angle": "30° – 90°",
                    "Motor": "2 HP"
                },
                imageCount: 1
            },
            {
                slug: "sample-notching-die-set",
                name: "Sample Notching Die Set",
                description: "Sample product for development. Replacement die set for a notching machine.",
                price: "18500",
                unit: "Set",
                minimumOrderQuantity: 2,
                specifications: {
                    "Sizes in set": "25, 32 and 38 mm",
                    "Material": "Hardened tool steel"
                },
                imageCount: 1
            }
        ]
    },
    {
        slug: "sample-pipe-swaging-machines",
        name: "Sample Pipe Swaging Machines",
        description: "Sample category for development: tube reducing and swaging.",
        displayOrder: 4,
        products: [
            {
                slug: "sample-automatic-tube-swaging-machine",
                name: "Sample Automatic Tube Swaging Machine",
                description: "Sample product for development. Reduces tube ends with an automatic feed for batch work.",
                price: "395000",
                unit: "Machine",
                specifications: {
                    "Tube outer diameter": "16 – 50 mm",
                    "Reduction length": "Up to 150 mm",
                    "Motor": "7.5 HP"
                },
                imageCount: 2,
                brochure: true
            },
            {
                slug: "sample-pole-swaging-machine",
                name: "Sample Pole Swaging Machine",
                description: "Sample product for development. Swages pole ends for street light and fencing poles.",
                price: "540000",
                unit: "Machine",
                specifications: {
                    "Pole outer diameter": "50 – 114 mm",
                    "Motor": "15 HP"
                },
                imageCount: 1
            },
            {
                slug: "sample-swaging-die",
                name: "Sample Swaging Die",
                description: "Sample product for development. Single swaging die; sold per piece.",
                price: "6500",
                unit: "Piece",
                minimumOrderQuantity: 4,
                specifications: {
                    "Material": "Alloy steel"
                },
                imageCount: 0
            }
        ]
    }
];

// Placeholder pictures labelled "Sample" so they cannot be mistaken for real photos.
const imageUrl = (index: number) =>
    `https://placehold.co/800x600/e5e7eb/1f2933/png?text=${encodeURIComponent(`Sample image ${index + 1}`)}`;

async function seed() {
    for (const category of catalog) {
        const { products, ...categoryData } = category;

        const savedCategory = await prisma.category.upsert({
            where: { slug: category.slug },
            create: { ...categoryData, status: "ACTIVE" },
            update: { ...categoryData, status: "ACTIVE" }
        });

        for (const product of products) {
            const data = {
                name: product.name,
                description: product.description,
                price: product.price,
                unit: product.unit,
                minimumOrderQuantity: product.minimumOrderQuantity ?? 1,
                specifications: product.specifications,
                status: "ACTIVE" as const,
                categoryId: savedCategory.id
            };

            const savedProduct = await prisma.product.upsert({
                where: { slug: product.slug },
                create: { slug: product.slug, ...data },
                update: data
            });

            // Media is replaced on every run so the seed stays repeatable.
            await prisma.$transaction([
                prisma.productImage.deleteMany({ where: { productId: savedProduct.id } }),
                prisma.productBrochure.deleteMany({ where: { productId: savedProduct.id } }),
                prisma.productImage.createMany({
                    data: Array.from({ length: product.imageCount }, (_, index) => ({
                        productId: savedProduct.id,
                        imageUrl: imageUrl(index),
                        displayOrder: index
                    }))
                }),
                ...(product.brochure
                    ? [prisma.productBrochure.create({
                        data: {
                            productId: savedProduct.id,
                            fileUrl: `https://example.com/${product.slug}-brochure.pdf`,
                            fileName: `${product.name} brochure.pdf`
                        }
                    })]
                    : [])
            ]);
        }
    }

    const productCount = catalog.reduce((total, category) => total + category.products.length, 0);
    console.log(`Sample catalog ready: ${catalog.length} categories, ${productCount} products.`);
}

async function remove() {
    const products = await prisma.product.findMany({
        where: { slug: { startsWith: SAMPLE_PREFIX } },
        select: { id: true, _count: { select: { inquiries: true } } }
    });

    // Inquiries reference their product, so products with inquiries are hidden instead of deleted.
    const withInquiries = products.filter((product) => product._count.inquiries > 0).map((product) => product.id);
    const deletable = products.filter((product) => product._count.inquiries === 0).map((product) => product.id);

    await prisma.product.updateMany({ where: { id: { in: withInquiries } }, data: { status: "ARCHIVED" } });
    const deletedProducts = await prisma.product.deleteMany({ where: { id: { in: deletable } } });

    const categories = await prisma.category.findMany({
        where: { slug: { startsWith: SAMPLE_PREFIX } },
        select: { id: true, _count: { select: { products: true } } }
    });
    const emptyCategories = categories.filter((category) => category._count.products === 0).map((category) => category.id);
    const deletedCategories = await prisma.category.deleteMany({ where: { id: { in: emptyCategories } } });
    await prisma.category.updateMany({
        where: { slug: { startsWith: SAMPLE_PREFIX }, id: { notIn: emptyCategories } },
        data: { status: "ARCHIVED" }
    });

    console.log(`Removed ${deletedProducts.count} sample products and ${deletedCategories.count} sample categories.`);

    if (withInquiries.length > 0) {
        console.log(`${withInquiries.length} sample products have inquiries, so they were archived instead of deleted.`);
    }
}

async function main() {
    if (process.env.NODE_ENV === "production") {
        throw new Error("The sample catalog is for development only and will not run when NODE_ENV=production.");
    }

    if (process.argv.includes("--remove")) {
        await remove();
    } else {
        await seed();
    }
}

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
