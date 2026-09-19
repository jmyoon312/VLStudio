import os
import sys
import numpy as np
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')

frames_dir = "05_Exports/channel_dna_audit/숏비타민c/frames"
files = sorted([f for f in os.listdir(frames_dir) if f.endswith('.jpg')])

print("=== Visual Forensic Analysis of Frames ===")
for f in files:
    path = os.path.join(frames_dir, f)
    img = Image.open(path)
    w, h = img.size
    arr = np.array(img)
    
    # Split into 5 vertical zones (0-20% Top, 20-40% Upper Mid, 40-60% Center, 60-80% Lower Mid, 80-100% Bottom)
    z1 = arr[:int(h*0.2), :]
    z2 = arr[int(h*0.2):int(h*0.4), :]
    z3 = arr[int(h*0.4):int(h*0.6), :]
    z4 = arr[int(h*0.6):int(h*0.8), :]
    z5 = arr[int(h*0.8):, :]
    
    # Check for near-black letterbox bands
    top_black_ratio = np.mean(z1 < 30)
    bot_black_ratio = np.mean(z5 < 30)
    
    # Check for bright white/yellow text in zones
    # White: R>200, G>200, B>200
    white_z1 = np.mean((z1[:,:,0] > 200) & (z1[:,:,1] > 200) & (z1[:,:,2] > 200))
    white_z2 = np.mean((z2[:,:,0] > 200) & (z2[:,:,1] > 200) & (z2[:,:,2] > 200))
    white_z4 = np.mean((z4[:,:,0] > 200) & (z4[:,:,1] > 200) & (z4[:,:,2] > 200))
    
    # Yellow: R>200, G>180, B<100
    yellow_z1 = np.mean((z1[:,:,0] > 200) & (z1[:,:,1] > 180) & (z1[:,:,2] < 100))
    yellow_z4 = np.mean((z4[:,:,0] > 200) & (z4[:,:,1] > 180) & (z4[:,:,2] < 100))
    
    print(f"[{f}] {w}x{h}")
    print(f"   Top 20% Black Ratio: {top_black_ratio:.1%} | White Pixels: {white_z1:.2%} | Yellow Pixels: {yellow_z1:.2%}")
    print(f"   Bottom 20% Black Ratio: {bot_black_ratio:.1%}")
    print(f"   Z4 (60-80% Subtitle Zone) White: {white_z4:.2%} | Yellow: {yellow_z4:.2%}")
