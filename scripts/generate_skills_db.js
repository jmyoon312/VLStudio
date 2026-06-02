import fs from 'fs';
import path from 'path';

const categories = {
    "Cinematic": {
        "cameras": ["Extreme close-up", "Low angle", "High angle", "Slow dolly zoom", "Tracking shot", "Drone view", "Over-the-shoulder", "Dutch angle", "Pan left", "Tilt up"],
        "lightings": ["Moody chiaroscuro", "Golden hour", "Neon rim light", "Volumetric fog and god rays", "Soft diffused lighting", "Harsh contrast", "Cinematic teal and orange", "Moonlight"],
        "qualities": ["8k, photorealistic, shot on 35mm lens, depth of field", "Masterpiece, ultra-detailed, cinematic grading, ARRI Alexa", "4k, high resolution, stunning textures"]
    },
    "Anime": {
        "cameras": ["Dynamic action angle", "Static emotional profile", "Wide establishing shot", "Focus on eyes", "Worm's eye view"],
        "lightings": ["Vibrant colors, dramatic shadows", "Soft pastel lighting", "Backlit glow, lens flare", "Dark moody ambiance"],
        "qualities": ["Studio Ghibli style, cel-shaded, highly detailed", "Makoto Shinkai style, breathtaking scenery, 4k", "Mappa style, intense action, fluid animation"]
    },
    "Cyberpunk": {
        "cameras": ["Low angle looking up at skyscrapers", "First-person perspective", "Wide shot", "Close-up on mechanical details"],
        "lightings": ["Neon pink and cyan, rainy reflections", "Harsh LED lighting, dark shadows", "Holographic glow, smoggy atmosphere"],
        "qualities": ["Unreal Engine 5 render, ray tracing, 8k, hyper-realistic", "Cyberpunk 2077 aesthetic, gritty textures, masterpiece"]
    },
    "Watercolor": {
        "cameras": ["Flat portrait view", "Wide scenic view", "Soft close-up"],
        "lightings": ["Even wash lighting", "Gentle sunlight filtering", "Dreamy ethereal glow"],
        "qualities": ["Traditional watercolor painting, visible brushstrokes, high quality", "Concept art, splash art, delicate paper texture"]
    },
    "3D Render": {
        "cameras": ["Isometric view", "Macro shot", "Wide panorama", "Dynamic floating angle"],
        "lightings": ["Studio lighting, soft box", "Global illumination, bounced light", "Candy-colored neon rim lights"],
        "qualities": ["Octane render, 4k, Cinema4D, glossy materials, cute", "Pixar style, subsurface scattering, highly detailed 3D"]
    },
    "Vintage/Retro": {
        "cameras": ["Slightly shaky handheld", "Static tripod shot", "Medium shot"],
        "lightings": ["Faded colors, light leaks", "Sepia tone, low contrast", "Flash photography, harsh direct light"],
        "qualities": ["1990s VHS aesthetic, film grain, nostalgic", "1950s Kodachrome, classic Hollywood look, 35mm film"]
    },
    "Fantasy": {
        "cameras": ["Epic wide shot", "Low angle hero shot", "Over-the-shoulder mystical view"],
        "lightings": ["Bioluminescent glow", "Ethereal magical lighting", "Dark fantasy shadows"],
        "qualities": ["Lord of the Rings style, intricate fantasy armor, masterpiece, 8k", "Elden Ring aesthetic, grimdark fantasy, highly detailed"]
    }
};

let skills = [];
let skill_id_counter = 1;

for (const [category, elements] of Object.entries(categories)) {
    for (const camera of elements.cameras) {
        for (const lighting of elements.lightings) {
            for (const quality of elements.qualities) {
                const skill = {
                    id: `skill_${category.toLowerCase()}_${String(skill_id_counter).padStart(3, '0')}`,
                    name: `${category} - ${camera.split(',')[0]}`,
                    category: category,
                    camera: camera,
                    lighting: lighting,
                    quality: quality,
                    prompt_template: `${camera}, [SUBJECT], ${lighting}, ${quality}`,
                    keywords: [category.toLowerCase(), camera.toLowerCase().split(' ')[0], "epic", "style"]
                };
                skills.push(skill);
                skill_id_counter++;
            }
        }
    }
}

// Pseudo-random function for reproducible shuffling
let seed = 42;
function random() {
    let x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
}

function shuffle(array) {
    let currentIndex = array.length,  randomIndex;
    while (currentIndex != 0) {
        randomIndex = Math.floor(random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
}

let selected_skills = [];
let cats = Object.keys(categories);

for (const c of cats) {
    let cat_skills = skills.filter(s => s.category === c);
    cat_skills = shuffle(cat_skills);
    let count = Math.floor(200 / cats.length); // approx 28 per category
    
    if (cat_skills.length > count) {
        selected_skills.push(...cat_skills.slice(0, count));
    } else {
        selected_skills.push(...cat_skills);
    }
}

// Pad if we didn't reach exactly 200
while (selected_skills.length < 200) {
    let extra = skills[Math.floor(random() * skills.length)];
    if (!selected_skills.includes(extra)) {
        selected_skills.push(extra);
    }
}

// Assign readable names and final IDs
selected_skills.forEach((s, i) => {
    s.id = `skill_${s.category.toLowerCase().replace('/', '_')}_${String(i).padStart(3, '0')}`;
    s.name = `[${s.category}] ${s.camera.split(' ')[0]} ${s.lighting.split(' ')[0]}`;
});

const dirPath = "C:/ViraLoopMedia/VLStudio/apps/api/app/data";
if (!fs.existsSync(dirPath)){
    fs.mkdirSync(dirPath, { recursive: true });
}

fs.writeFileSync(path.join(dirPath, "prompt_skills.json"), JSON.stringify(selected_skills, null, 2));

console.log(`Successfully generated ${selected_skills.length} skills.`);
