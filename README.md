# 🌤️ Weatherguessr

A fun geography and weather game where you match US states to weather categories based on their rankings!

## 🎮 How to Play

1. **Enter your username** to start tracking your scores
2. **Click "Roll"** to get a random US state
3. **Select a weather category** where you think that state ranks highest
4. **Get your score** based on the state's ranking (1 = best, 100+ = worst)
5. **Complete all 8 categories** to finish the round
6. **Try to get the lowest total score possible!**

## 🌡️ Weather Categories

- 🌪️ **Tornados (Yearly Avg)** - Average annual tornado count
- 🌧️ **Rainfall (Yearly Avg)** - Average annual precipitation
- 🔥 **Highest Temperature (Historic)** - Record high temperatures
- ❄️ **Lowest Temperature (Historic)** - Record low temperatures  
- ☀️ **Sunshine (Yearly Avg)** - Average annual sunny days
- 💨 **Wind (Yearly Avg)** - Average wind speeds
- 🌨️ **Snowfall (Yearly Avg)** - Average annual snowfall
- ⚡ **Lightning (Yearly Avg)** - Lightning strike frequency

## 🏆 Scoring System

- **Rank #1** = 1 point
- **Rank #2** = 2 points
- **...**
- **Rank #100+** = 100+ points

**Goal**: Get the lowest total score possible!

## 🚀 Quick Start

### Local Development
```bash
# Clone the repository
git clone <your-repo-url>
cd weatherguessr

# Open index.html in your browser
# Or use a local server:
python -m http.server 8000
# Then visit http://localhost:8000
```

### Free Hosting Options
- **GitHub Pages**: Push to GitHub and enable Pages
- **Netlify**: Drag and drop the folder to deploy
- **Vercel**: Connect your GitHub repo for automatic deployment
- **Firebase Hosting**: Free hosting with Google

## 📊 Features

- ✅ **Username tracking** with date stamps
- ✅ **Best score saving** (lowest total score)
- ✅ **Reset button** to restart rounds
- ✅ **Real weather data** for all 50 US states
- ✅ **Responsive design** works on mobile and desktop
- ✅ **No external dependencies** - pure HTML/CSS/JavaScript
- ✅ **Local storage** for persistent scores

## 🎯 Game Mechanics

- Each category can only be used **once per round**
- States are randomly selected from all 50 US states
- Scores are based on real weather statistics
- Best scores are saved locally under your username
- Share your scores with friends!

## 📱 Browser Compatibility

- Chrome, Firefox, Safari, Edge
- Mobile browsers (iOS Safari, Chrome Mobile)
- No internet connection required after initial load

## 🔧 Technical Details

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Data Storage**: Local Storage (browser)
- **No Backend Required**: Completely client-side
- **File Size**: < 1MB total

## 🎨 Customization

Want to add more categories or modify the game? The code is well-commented and easy to extend:

- Add new weather categories in `data.js`
- Modify styling in `style.css`
- Update game logic in `script.js`

## 📈 Future Enhancements

- [ ] Global weather data (countries instead of states)
- [ ] Seasonal weather variations
- [ ] Multiplayer mode
- [ ] Achievement system
- [ ] Weather factoids after each round

## 🤝 Contributing

Feel free to contribute improvements, bug fixes, or new features!

## 📄 License

MIT License - feel free to use and modify!

---

**Have fun guessing weather patterns across the United States!** 🌈⛈️
