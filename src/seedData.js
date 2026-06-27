const cover =
  "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?auto=format&fit=crop&w=1400&q=80";
const shotA =
  "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=900&q=80";
const shotB =
  "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=900&q=80";
const shotC =
  "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?auto=format&fit=crop&w=900&q=80";
const shotD =
  "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=900&q=80";

/** Demo content for local UI dev when API mode is off and localStorage is empty. */
export const seedContent = [
  {
    id: "seed-homura-hime",
    type: "review",
    slug: "homura-hime-review",
    title: "Homura Hime",
    authorName: "Gary The Bard",
    excerpt:
      "A stylish hack-and-slash with Devil May Cry energy. Combat feels sharp, though build variety still needs room to grow.",
    body: "Homura Hime nails the fundamentals of fast action combat.\n\n[img1]\n\nEnemy variety keeps arenas tense, and dodge timing rewards aggressive play without feeling cheap.\n\nThe soundtrack punches during boss encounters, and frame pacing stayed stable in the sessions I tested.\n\nimg1: https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80 | Combat arena",
    imageUrl: cover,
    screenshots: [shotA, shotB, shotC, shotD],
    bardScore: 8.5,
    buildQuality: null,
    respectsYourTime: null,
    genres: ["Hack and Slash", "Action"],
    relatedGames: ["Devil May Cry 5", "Bayonetta"],
    platforms: ["PC"],
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 2
  },
  {
    id: "seed-pragmata",
    type: "review",
    slug: "pragmata-review",
    title: "Pragmata Review",
    authorName: "Gary The Bard",
    excerpt:
      "Ambitious sci-fi action with strong art direction. Pacing is uneven, but the core loop has real potential.",
    body: "Pragmata leads with atmosphere and spectacle.\n\n[img1]\n\nTraversal and combat systems are promising, though some encounters run longer than the story beats they support.\n\nimg1: https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80 | City vista",
    imageUrl: shotB,
    screenshots: [shotB, shotC, shotA],
    bardScore: 7.2,
    buildQuality: 6.5,
    respectsYourTime: "B",
    genres: ["Action", "Sci-Fi"],
    relatedGames: ["Death Stranding", "Replicant"],
    platforms: ["PC", "PS5"],
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 5
  },
  {
    id: "seed-mistfall",
    type: "article",
    slug: "mistfall-hunters-impressions",
    title: "Mistfall Hunters",
    authorName: "Gary The Bard",
    excerpt:
      "Early impressions from a session focused on co-op readability, loot cadence, and how quickly new players can contribute.",
    body: "Mistfall Hunters asks teams to communicate often, but not so much that solo-minded players get left behind.\n\n[img1]\n\nThe first hour is front-loaded with systems, yet the combat sandbox opens up quickly once perks start stacking.\n\nimg1: https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?auto=format&fit=crop&w=1200&q=80 | Co-op encounter",
    imageUrl: shotC,
    screenshots: [shotC, shotD],
    genres: ["Co-op", "Action RPG"],
    relatedGames: ["Deep Rock Galactic", "Risk of Rain 2"],
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 9
  }
];
