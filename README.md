# ASTRAFORGE

Forge your place among the stars.

ASTRAFORGE is a cinematic, generative constellation experience built with React, React Three Fiber, and procedural geometry. Progress is expressed through motion, glow, and alignment rather than traditional UI.

## Features

### HOME Page
- Cinematic intro sequence with title formation via canvas
- Procedurally generated starfield
- Interactive globe visualization
- **Continue Application** button to enter the workflow

### APPLICATION Workflow (4-Step Dashboard)

1. **Profile Step**
   - Enter name and focus/discipline
   - Earn +20 Stellar Energy (XP)

2. **Tasks Step**
   - Complete 4 mission tasks
   - Each task: +10 XP
   - Real-time progress ring visualization
   - Unlock badges at 50 and 100 XP thresholds

3. **Submission Step**
   - Review and confirm application
   - Earn +30 XP on submission
   - Confetti celebration animation

4. **Status Step** (New Enhancement)
   - **Completion Certificate** (styled snapshot container)
   - **Share Snapshot Feature:**
     - Generate certificate image with html2canvas
     - Native Web Share API integration
     - Download fallback for all browsers
   - **Application Timeline:**
     - Displays all milestones with sequential fade-in
     - Shows XP earned per action
     - Persistent across page reloads
   - **Safe Reset:**
     - Two-click confirmation pattern
     - Clears all state and returns to HOME

### Global Features
- **Persistent State:** All progress saved to localStorage via Zustand
- **Dynamic Globe:** Visual state mapped to application progress
- **Badge System:** Unlock achievements at XP milestones
- **XP Counter:** Real-time Stellar Energy display with pulse feedback

## Technical Stack

- **Frontend:** React 18 + TypeScript
- **Build Tool:** Vite
- **3D Graphics:** Three.js via React Three Fiber
- **State Management:** Zustand with persistence
- **Image Capture:** html2canvas
- **Graphics Enhancement:** Postprocessing (Bloom, Vignette)
- **Styling:** CSS with animations

## Development

- Install dependencies: `npm install`
- Start dev server: `npm run dev` (runs on http://localhost:5174)
- Build: `npm run build`
- Preview: `npm run preview`

## Documentation

- **[ENHANCEMENT_SUMMARY.md](./ENHANCEMENT_SUMMARY.md)** - Overview of Status Step enhancements
- **[TESTING_GUIDE.md](./TESTING_GUIDE.md)** - Complete QA and testing workflow
- **[TECHNICAL_REFERENCE.md](./TECHNICAL_REFERENCE.md)** - Developer technical details

## Project Structure

```
src/
├── App.tsx                 # Main app component (HOME/APPLICATION routing)
├── main.tsx                # React entry point
├── index.css               # All styling including new snapshot/timeline styles
├── scene/
│   ├── AstraforgeScene.tsx # Globe and starfield visualization
│   └── globeConfig.ts      # Globe constants and configuration
└── state/
    └── useAstraforgeStore.ts  # Zustand store (state + timeline persistence)
```

## Browser Support

| Feature | Chrome | Firefox | Safari | Mobile |
|---------|--------|---------|--------|--------|
| Application | ✅ | ✅ | ✅ | ✅ |
| Web Share API | ✅ | ✅ | ✅ | ✅ (iOS 13+) |
| Download Fallback | ✅ | ✅ | ✅ | ✅ |
| All Animations | ✅ | ✅ | ✅ | ✅ |

## Dependencies

### Key Packages
- `react@^18.2.0` - UI framework
- `three@^0.161.0` - 3D graphics
- `@react-three/fiber@^8.15.0` - React renderer for Three.js
- `zustand@^4.5.2` - State management
- `html2canvas@^1.4.1` - Snapshot image generation

## Future Enhancements

- PDF export of completion certificate
- Social media card sharing
- Leaderboard integration
- Custom certificate branding
- Email sharing of snapshot

---

**Built with ✨ for dreamers and builders.**
