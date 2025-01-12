require('dotenv').config();
const mongoose = require('mongoose');
const Match = require("./models/Match");
const Scorecard = require('./models/scorecard');

// Connect to MongoDB
(async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');
    } catch (err) {
        console.error('Failed to connect to MongoDB:', err);
        process.exit(1);
    }

    mongoose.set('bufferTimeoutMS', 30000);

    // Utility function to find common words between two strings
    const findUnion = (str1, str2) => (str1.split('-').join(' ') === str2 ? [str1, str2] : []);

    // Utility function to transform bowling data
    const transformBowlingData = (data) => {
        const { '0': dots, '4': fours, '6': sixes, ...rest } = data;
        return {
            ...rest,
            Dot: dots,
            '4s': fours,
            '6s': sixes,
        };
    };

    

    // Fetch players list
    const getPlayersList = async (matchId) => {
        try {
            const match = await Match.findById(matchId);
            if (!match || !match.team1Squad || !match.team2Squads) throw new Error('Match data is incomplete.');

            const team1Players = match.team1Squad[0].split(',').map(name => name.trim().toLowerCase());
            const team2Players = match.team2Squads[0].split(',').map(name => name.trim().toLowerCase());

            return [team1Players,match.team2,team2Players,match.team1];
        } catch (error) {
            console.error('Error fetching players list:', error.message);
            throw error;
        }
    };

    // Fetch scorecards
    const getScorecards = async (team) => {
        return await Scorecard.find({
            $or: [
                { "matchInfo.team1": team},
                { "matchInfo.team2": team},
            ]
        }, { scoreCard: 1 });
    };


    try {
        const matchId = "6783e6518e609577476964ad";
        const match = await Match.findById(matchId);
        if (!match || !match.team1Squad || !match.team2Squads) throw new Error('Match data is incomplete.');
    
        const playersList1 = match.team1Squad.map(name => name.trim().toLowerCase());
        const playersList = match.team2Squads.map(name => name.trim().toLowerCase());
    
        const scorecards = await getScorecards(match.team1);
        
        const data1 = match.h2hData[0] || {};  // Fallback to an empty object if undefined
        const batsman50h2h = match.batsman50h2h[0] || {};  // Fallback to empty object if undefined
        const bowler3h2h = match.bowler3h2h[0] || {};  // Fallback to empty object if undefined
    
        const addPlayerData1 = (playerName, score, scorecardId) => {
            const newEntry = [score, scorecardId];
        
            // Check if the player already exists in the object
            if (bowler3h2h[playerName]) {
                bowler3h2h[playerName].push(newEntry); // Add to existing player's data
            } else {
                bowler3h2h[playerName] = [newEntry]; // Create a new entry for the player
            }
        };
    
        const addPlayerData = (playerName, score, scorecardId) => {
            const newEntry = [score, scorecardId];
        
            // Check if the player already exists in the object
            if (batsman50h2h[playerName]) {
                batsman50h2h[playerName].push(newEntry); // Add to existing player's data
            } else {
                batsman50h2h[playerName] = [newEntry]; // Create a new entry for the player
            }
        };
    
        // Process scorecards
        for (const { _id: scorecardId, scoreCard } of scorecards) {
            for (const { innings, data } of scoreCard) {
                for (const entry of data) {
                    const playerField = entry.Batsman ? 'Batsman' : entry.Bowler ? 'Bowler' : null;
                    if (!playerField) continue;
    
                    const playerName = entry[playerField].toLowerCase();
                    for (const player of playersList) {
                        if (!findUnion(playerName, player).length) continue;
    
                        // Add entry to player's data
                        if (!data1[player]) data1[player] = [];
                        let entryData = { innings, ...entry };
    
                        // Handle Bowler Data
                        if (playerField === 'Bowler') {
                            entryData = transformBowlingData(entryData);
                            if (parseInt(entry.W, 10) > 2) {
                                addPlayerData1(player, entry.W + "W", scorecardId);
                            }
                        }
    
                        // Handle Batsman Data
                        if (playerField === 'Batsman') {
                            if (parseInt(entry.R, 10) > 49) {
                                addPlayerData(player, entry.R, scorecardId);
                            }
                        }
    
                        // Finalize entry data
                        entryData.ScorecardDetails = scorecardId;
                        delete entryData[playerField];
                        data1[player].push(entryData);
                    }
                }
            }
        }
    
        // Update the Match document
        const updatedMatch = await Match.findByIdAndUpdate(
            matchId,
            { h2hData: data1, batsman50h2h, bowler3h2h },  // Directly pass objects as they are
            { new: true }
        );
    
        console.log('Updated Match document:', updatedMatch);
    } catch (error) {
        console.error('Error processing data:', error.message);
    } finally {
        mongoose.connection.close();
    }
    

    // try {
    //     const matchId = "677e4abcd2d2993aaa054344";
    //     const match = await Match.findById(matchId);
    //     if (!match || !match.team1Squad || !match.team2Squads) throw new Error('Match data is incomplete.');

    //     const playersList1 = match.team1Squad[0].split(',').map(name => name.trim().toLowerCase());
    //     const playersList = match.team2Squads[0].split(',').map(name => name.trim().toLowerCase());

        
    //     const scorecards = await getScorecards(match.team1);
        
    //     const data1 = match.h2hData[0];
    //     const batsman50h2h = Object.fromEntries(match.batsman50h2h[0]);
    //     const bowler3h2h = Object.fromEntries(match.bowler3h2h[0]);

    //     const addPlayerData1 = (playerName, score, scorecardId) => {
    //         const newEntry = [score, scorecardId];
        
    //         // Check if the player already exists in the object
    //         if (bowler3h2h[playerName]) {
    //             bowler3h2h[playerName].push(newEntry); // Add to existing player's data
    //         } else {
    //             bowler3h2h[playerName] = [newEntry]; // Create a new entry for the player
    //         }
    //     };

    //     const addPlayerData = (playerName, score, scorecardId) => {
    //         const newEntry = [score, scorecardId];
        
    //         // Check if the player already exists in the object
    //         if (batsman50h2h[playerName]) {
    //             batsman50h2h[playerName].push(newEntry); // Add to existing player's data
    //         } else {
    //             batsman50h2h[playerName] = [newEntry]; // Create a new entry for the player
    //         }
    //     };

    //     // Process scorecards
    //     for (const { _id: scorecardId, scoreCard } of scorecards) {
    //         for (const { innings, data } of scoreCard) {
    //             for (const entry of data) {
    //                 const playerField = entry.Batsman ? 'Batsman' : entry.Bowler ? 'Bowler' : null;
    //                 if (!playerField) continue;

    //                 const playerName = entry[playerField].toLowerCase();
    //                 for (const player of playersList) {
    //                     if (!findUnion(playerName, player).length) continue;

    //                     // Add entry to player's data
    //                     if (!data1[player]) data1[player] = [];
    //                     let entryData = { innings, ...entry };

    //                     // Handle Bowler Data
    //                     if (playerField === 'Bowler') {
    //                         entryData = transformBowlingData(entryData);
    //                         if (parseInt(entry.W, 10) > 2) {
    //                             addPlayerData1(player,entry.W+"W",scorecardId)
    //                         }
    //                     }

    //                     // Handle Batsman Data
    //                     if (playerField === 'Batsman') {
    //                         if (parseInt(entry.R, 10) > 49) {
    //                             addPlayerData1(player,entry.R,scorecardId)
    //                         }
    //                     }

    //                     // Finalize entry data
    //                     entryData.ScorecardDetails = scorecardId;
    //                     delete entryData[playerField];
    //                     data1[player].push(entryData);
    //                 }
    //             }
    //         }
    //     }

    //     // Convert Maps to Objects
    //     const batsman50h2hObject = Object.fromEntries(batsman50h2h);
    //     const bowler3h2hObject = Object.fromEntries(bowler3h2h);

    //     // Update the Match document
    //     const updatedMatch = await Match.findByIdAndUpdate(
    //         matchId,
    //         { h2hData: data1, batsman50h2h: batsman50h2hObject, bowler3h2h: bowler3h2hObject },
    //         { new: true }
    //     );

    //     console.log('Updated Match document:', updatedMatch);
    // } catch (error) {
    //     console.error('Error processing data:', error.message);
    // } finally {
    //     mongoose.connection.close();
    // }


})();
