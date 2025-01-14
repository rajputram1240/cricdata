require('dotenv').config();
const mongoose = require('mongoose');
const Match = require("./models/Match");
const Scorecard = require('./models/scorecard');

// Connect to MongoDB
(async () => {
    try {
        await mongoose.connect("mongodb+srv://pratap11191:XwmG3rC43LiJkRUM@cluster0.41bnq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0");
        console.log('Connected to cricdata database');
    } catch (err) {
        console.error('Failed to connect to MongoDB', err);
        process.exit(1);
    }

    mongoose.set('bufferTimeoutMS', 30000);

    // Utility function to find common words between two strings
    const getBowlerName = (searchbowlers, playersList,bowlers) => {
        const matchedBowler = bowlers.find(bowler => bowler.toLowerCase().includes(searchbowlers.toLowerCase()));
        const checkBowler = playersList.find(bowler => bowler.toLowerCase().includes(matchedBowler));

        return checkBowler?checkBowler:"";
    };

    // Fetch players list
    const getPlayersList = async () => {
        try {
            const match = await Match.findById({ _id: "67855094cbced5c1dc10c3c3" });
            
            // Check if the match object and the required fields exist
            if (!match || !match.team1Squad || !match.team2Squads) {
                throw new Error("Match data is incomplete.");
            }
    
            let t1 = match.team1Squad;
            let t2 = match.team2Squads;
    
            // Process and combine both teams' squads, trimming spaces and converting to lowercase
            let playersList = [
                t1.map(name => name.trim().toLowerCase()),
                t2.map(name => name.trim().toLowerCase())
            ];
          
    
            return playersList;
        } catch (error) {
            console.error("Error fetching players list:", error);
            throw new Error("Failed to fetch players list.");
        }
    };
    

    // Fetch scorecards
    const getScorecards = async () => {
        
        return await Scorecard.find({},{ scoreCard: 1, _id: 0 });
    };
    
    try {
        const playersList = await getPlayersList(); // Fetch team squads
        console.log(playersList);
        const scorecards = await getScorecards(); // Fetch scorecards
        const data1 = new Map(); // Use a Map to match the schema
    
        scorecards.forEach(({ scoreCard }) => {
            for (let i = 0; i < scoreCard.length; i += 2) {
                const { data } = scoreCard[i]; // Extract batting data
                const bowlers = scoreCard[i + 1].data.map(entry => entry.Bowler.toLowerCase());
    
                data.forEach(entry => {
                    const playerName = entry.Batsman.toLowerCase();
                    const haveBatsman = playersList[0].find(player => player.includes(playerName));
                    const haveBatsman1 = playersList[1].find(player => player.includes(playerName));
                    const dismissalWords = entry.Dismissal.split(" ");

                    if(haveBatsman){
                        const bowlerName = getBowlerName(dismissalWords[dismissalWords.length - 1], playersList[1], bowlers);
    
                    if (!dismissalWords.includes("(") && bowlerName) {
                        if (!data1.has(haveBatsman)) {
                            data1.set(haveBatsman, new Map());
                        }
    
                        const batsmanData = data1.get(haveBatsman);
    
                        if (!batsmanData.has(bowlerName)) {
                            batsmanData.set(bowlerName, 0);
                        }
    
                        batsmanData.set(bowlerName, batsmanData.get(bowlerName) + 1);
                    }
                    } else if(haveBatsman1){
                        const bowlerName = getBowlerName(dismissalWords[dismissalWords.length - 1], playersList[0], bowlers);
    
                        if (!dismissalWords.includes("(") && bowlerName) {
                            if (!data1.has(haveBatsman1)) {
                                data1.set(haveBatsman1, new Map());
                            }
        
                            const batsmanData = data1.get(haveBatsman1);
        
                            if (!batsmanData.has(bowlerName)) {
                                batsmanData.set(bowlerName, 0);
                            }
        
                            batsmanData.set(bowlerName, batsmanData.get(bowlerName) + 1);
                        }
                    }
                });
            }
        });
    
        // Transform Map structure for MongoDB
        const formattedData = Object.fromEntries(
            Array.from(data1.entries()).map(([batsman, bowlers]) => [
                batsman,
                Object.fromEntries(bowlers.entries()),
            ])
        );
    
        // Update the document in MongoDB
        const updatedMatch = await Match.findByIdAndUpdate(
            { _id: "67855094cbced5c1dc10c3c3" },
            { matchupData: formattedData },
            { new: true }
        );
    
        console.log("Updated Match Document:", updatedMatch);
    } catch (err) {
        console.error("Error processing data:", err);
    } finally {
        mongoose.connection.close();
    }
    
    

    // try {
    //     const playersList = await getPlayersList();
    //     const scorecards = await getScorecards();
    //     const data1 = {};
       
    //     scorecards.forEach(({ scoreCard }) => {
    //         for (let i = 0; i < scoreCard.length; i += 2) {
    //             const { innings, data } = scoreCard[i];
    //             const bowlers = scoreCard[i+1].data.map(entry => entry.Bowler);
    //             data.forEach(entry => {
    //                 let playerName = entry.Batsman;
    //                 let haveBatsman = playersList.find(bowler => bowler.toLowerCase().includes(playerName.toLowerCase()));
    //                 let word = entry.Dismissal.split(" ");
    //                 let bowlersName = getBowlerName(word[word.length - 1],playersList,bowlers);

    //                 if(haveBatsman && !word.includes("(") && bowlersName){
    //                          if (!data1[haveBatsman]) data1[haveBatsman] = [];
                       
    //                         if (!data1[haveBatsman][bowlersName]) data1[haveBatsman][bowlersName] = 0;
    //                         data1[haveBatsman][bowlersName] = ++data1[haveBatsman][bowlersName];  
                         
    //                 }
    //             });
    //         }
    //     });
     
    //   let dc = await Match.findByIdAndUpdate({ _id: "677bc84e3de86a01990a9c8d" },{ matchupData: data1 }, { new: true });

    //    console.log(typeof data1,data1);
    // } catch (err) {
    //     console.error('Error processing data:', err);
    // } finally {
    //     mongoose.connection.close();
    // }
})();