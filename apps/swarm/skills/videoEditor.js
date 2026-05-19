export const videoEditor = {
    /**
     * Get default props based on composition type
     */
    getDefaultProps(compositionId = "UniversalVideo") {
        if (compositionId === "DynamicShorts") {
            return {
                mainVideo: { src: "", scaleMode: "1:1", volume: 1 },
                topBar: { height: 100, backgroundColor: "black", text: "" },
                bottomBar: { height: 100, backgroundColor: "black" },
                subtitles: []
            };
        }
        if (compositionId === "AIMovie") {
            return { scenes: [] };
        }
        // UniversalVideo
        return {
            title: "New Project",
            clips: [],
            audio: { src: "", volume: 1 },
            subtitles: []
        };
    },

    /**
     * Create a new video section or update Shorts props
     */
    createSection(type, data, compositionId = "UniversalVideo") {
        if (compositionId === "DynamicShorts") {
            if (type === 'video') return { mainVideo: { src: data.src, scaleMode: data.scaleMode || "1:1", volume: data.volume || 1 } };
            if (type === 'text') return { topBar: { text: data.text, backgroundColor: data.backgroundColor || "black", height: data.height || 100 } };
            return {};
        }

        if (compositionId === "AIMovie") {
            return {
                type: data.type || 'video',
                src: data.src,
                audioSrc: data.audioSrc,
                subtitle: data.subtitle,
                durationInFrames: data.durationInFrames || 150,
                metadata: {
                    dialect: data.dialect || 'standard'
                }
            };
        }

        // UniversalVideo
        const clip = {
            type: type, // 'image', 'video', 'text'
            durationInFrames: data.durationInFrames || 90,
            style: data.style || {}
        };

        if (type === 'text') {
            clip.text = data.text || "Hello World";
            clip.style = {
                backgroundColor: data.backgroundColor || '#1a1a1a',
                color: data.color || 'white',
                ...clip.style
            };
        } else if (type === 'image' || type === 'video') {
            clip.src = data.src;
        }

        return clip;
    },

    /**
     * Merge new section or patch into existing props
     */
    addSection(currentProps, newSection, compositionId = "UniversalVideo") {
        const props = currentProps || this.getDefaultProps(compositionId);

        if (compositionId === "DynamicShorts") {
            return { ...props, ...newSection };
        }

        if (compositionId === "AIMovie") {
            if (!props.scenes) props.scenes = [];
            props.scenes.push(newSection);
            return props;
        }

        // UniversalVideo
        if (!props.clips) props.clips = [];
        props.clips.push(newSection);
        return props;
    }
};
