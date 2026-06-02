import json
import os

categories = {
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
}

skills = []
skill_id_counter = 1

for category, elements in categories.items():
    for camera in elements["cameras"]:
        for lighting in elements["lightings"]:
            for quality in elements["qualities"]:
                
                # Create a diverse set by selecting a few combinations to reach ~200.
                # Actually, 10*8*3 (Cinematic) = 240 alone. 
                # Let's sub-sample to get a clean 200 across all categories.
                
                skill = {
                    "id": f"skill_{category.lower()}_{skill_id_counter:03d}",
                    "name": f"{category} - {camera.split(',')[0]}",
                    "category": category,
                    "camera": camera,
                    "lighting": lighting,
                    "quality": quality,
                    "prompt_template": f"{camera}, [SUBJECT], {lighting}, {quality}",
                    "keywords": [category.lower(), camera.lower().split(' ')[0], "epic", "style"]
                }
                skills.append(skill)
                skill_id_counter += 1

# Subsample to exact 200 diverse skills to avoid bloat, 
# ensuring every category has representation.
import random
random.seed(42) # For reproducibility
selected_skills = []
cats = list(categories.keys())

for c in cats:
    cat_skills = [s for s in skills if s["category"] == c]
    # Distribute 200 among categories
    count = 200 // len(cats)
    if len(cat_skills) > count:
        selected_skills.extend(random.sample(cat_skills, count))
    else:
        selected_skills.extend(cat_skills)

# Pad if we didn't reach exactly 200
while len(selected_skills) < 200:
    extra = random.choice(skills)
    if extra not in selected_skills:
        selected_skills.append(extra)

# Assign readable names
for i, s in enumerate(selected_skills):
    s['id'] = f"skill_{s['category'].lower().replace('/', '_')}_{i:03d}"
    s['name'] = f"[{s['category']}] {s['camera'].split(' ')[0]} {s['lighting'].split(' ')[0]}"
    
os.makedirs("C:/ViraLoopMedia/VLStudio/apps/api/app/data", exist_ok=True)
with open("C:/ViraLoopMedia/VLStudio/apps/api/app/data/prompt_skills.json", "w", encoding="utf-8") as f:
    json.dump(selected_skills, f, ensure_ascii=False, indent=2)

print(f"Successfully generated {len(selected_skills)} skills.")
