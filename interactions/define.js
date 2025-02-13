const WordPos = require("wordpos");
const wordpos = new WordPos();
const lookupResponse = require("../utils/lookupResponse");
const spellcheck = require("../utils/spellcheck");
const npmrequest = require("request");
var Filter = require('bad-words'),
    filter = new Filter();
filter.addWords("sexual");

module.exports = async interaction => {
    let definitions = {...base_definitions};

    /*
    if (message.guild && message.guild.id == "548440972997033996") {
        for (let i = 0; i < majsoul_removals.length; i++) {
            delete definitions[majsoul_removals[i]];
        }
        
        definitions = Object.assign(definitions, majsoul_edits);
    }
    */

    let term = interaction.options.getString('term');

    let responseObject = lookupResponse(term, definitions, aliases);

    if (responseObject.response) {
        return interaction.reply(responseObject.response);
    }

    if (responseObject.request === "") {
        var keys = Object.keys(definitions);
        var suggestion = keys[Math.floor(Math.random() * keys.length)];
        return interaction.reply(`You... didn't ask me to define anything. How about... ${suggestion}. ${definitions[suggestion]}`);
    }

    wordpos.lookup(responseObject.request, (result, word) => {
        if(result[0] && result[0].def) {
            if (filter.isProfane(result[0].def)) {
                if (result[1] && result[1].def) {
                    if (filter.isProfane(result[1].def)) {
                        return interaction.reply(`The dictionary definition for that is NSFW.`); 
                    }
                    return interaction.reply(`The dictionary says: ${result[1].def.trim()}.`); 
                }
                return interaction.reply(`The dictionary definition for that is NSFW.`); 
            }
            return interaction.reply(`The dictionary says: ${result[0].def.trim()}.`); 
        } else {
            let requestArray = term.split(" ");
            let request = requestArray.join("").toLowerCase();

            // check jisho
            // https://jisho.org/api/v1/search/words?keyword=house
            npmrequest(`https://jisho.org/api/v1/search/words?keyword=${encodeURI(request)}%20%23mahj`, {json:true, timeout:10000}, (err, res, body) => {
                if(!err && body) {
                    for (let i = 0; i < body.data.length; i++) {
                        for (let j = 0; j < body.data[i].senses.length; j++) {
                            for (let k = 0; k < body.data[i].senses[j].length; k++) {
                                console.log(body.data[i].senses[j].tags[k]);
                                if (body.data[i].senses[j].tags[k] == "Mahjong term") {
                                    return interaction.reply(`Jisho defines ${request} (${body.data[i].japanese[0].word}) as "${body.data[i].senses[j].english_definitions[0]}."`);
                                }
                            }
                        }
                    }
    
                    if (body.data.length) {
                        return interaction.reply(`Jisho defines ${request} (${body.data[0].japanese[0].word}) as "${body.data[0].senses[0].english_definitions[0]}."`);
                    }
                }

                var possibilities = spellcheck(request, Object.keys(definitions));

                if (possibilities.distance <= 2 && possibilities.closest.length == 1) {
                    return interaction.reply(`The closest thing to ${request} I know is ${possibilities.closest[0]}. ${definitions[possibilities.closest[0]]}`);
                }

                if (possibilities.distance > 3) {
                    possibilities = spellcheck(request, Object.keys(aliases));

                    if (possibilities.distance <= 2 && possibilities.closest.length == 1) {
                        return interaction.reply(`The closest thing to ${request} I know is ${possibilities.closest[0]}. ${definitions[aliases[possibilities.closest[0]]]}`);
                    }

                    if (possibilities.distance > 3) {
                        return interaction.reply(`I don't know the definition of ${responseObject.request}. Can anyone give me a hand?`);
                    }
                }

                let suggestions = possibilities.closest.length == 1
                    ? possibilities.closest[0]
                    : possibilities.closest.slice(0, -1).join(", ") + ', or ' + possibilities.closest.slice(-1);
                return interaction.reply(`I don't know the definition of ${responseObject.request}. Did you mean ${suggestions}?`);
            });
        }
    });
}

const base_definitions = {
    "tanyao": "Tanyao is a hand that contains only number tiles from 2 through 8. It's worth one han, and is usually allowed to be open. See kuitan for more on that.\nExample: <:2m:466437921550106627><:3m:466437922577580052><:4m:466437922556608522><:7m:466437922250555393><:7m:466437922250555393><:7m:466437922250555393><:5p:466437922732769290><:6p:466437922393030657><:7p:466437922980102144><:2s:466437921663352842><:2s:466437921663352842><:6s:466437922586099723><:7s:466437922632105984><:8s:466437922380316673>.",
    "kuitan": "Kuitan is a rule that allows open tanyao. Kuitan ari means open tanyao is allowed, while kuitan nashi means it's not allowed, and you can only score tanyao if your hand is closed. Kuitan ari is the more popular option.",
    "tenpai": "A hand is tenpai if it's one tile away from winning.",
    "furiten": "Furiten is a rule that prevents you from winning a hand by ron if you have a tile in your discards that would complete your hand. For example, if your final shape was <:2p:466437922669985823><:3p:466437922426716161>, and you had a <:1p:466437920908378113> in your discards, you could not win the hand by ron, even on the <:4p:466437922401550337>.",
    "tsumo": "Tsumo is the act of drawing a tile yourself.",
    "tsumogiri": "Tsumogiri is when a player cuts (giri) the tile they drew (tsumo). The opposite is tedashi, cutting a tile from the hand.",
    "tedashi": "Tedashi is when a player cuts (dashi, go out) a tile from their hand (te). The opposite is tsumogiri, cutting the tile that was drawn.",
    "ryanmen": "A ryanmen shape is a two-sided wait for a run, such as <:2p:466437922669985823><:3p:466437922426716161>.",
    "kanchan": "A kanchan shape is a closed wait for a run, such as <:2p:466437922669985823><:4p:466437922401550337>.",
    "penchan": "A penchan shape is an edge wait for a run, such as <:1p:466437920908378113><:2p:466437922669985823>.",
    "shanpon": "A shanpon shape is when you are waiting for one of two pairs to turn into a triplet, such as <:2p:466437922669985823><:2p:466437922669985823><:4s:466437922527248384><:4s:466437922527248384>.",
    "tanki": "A tanki is when you're tenpai and waiting on a tile to complete a pair.",
    "hadaka": "A hadaka tanki is when you've called four times, and are left with a single tile in your hand.",
    "entotsu": "An entotsu shape is when you're waiting either on a ryanmen or a shanpon. It looks like <:2p:466437922669985823><:2p:466437922669985823><:2p:466437922669985823><:3p:466437922426716161><:4p:466437922401550337><:3z:466437922560671744><:3z:466437922560671744>. This wins on <:2p:466437922669985823>-<:5p:466437922732769290> and <:3z:466437922560671744>.",
    "sanmenchan": "A sanmenchan is a three-sided wait for a run, such as <:2p:466437922669985823><:3p:466437922426716161><:4p:466437922401550337><:5p:466437922732769290><:6p:466437922393030657>.",
    "gyakuten": "Gyakuten is the act of improving your placement, usually in the final round of a game.",
    "suji": "Suji refers to tiles three more or less than a tile. For example, <:2p:466437922669985823> and <:8p:466437922380316683> are suji of the <:5p:466437922732769290> tile. See this article for more information: http://riichi.wiki/Suji",
    "nakasuji": "Nakasuji refers to when a middle tile is made safer by both of its suji being in an opponents' discards. If an opponent had cut both <:2p:466437922669985823> and <:8p:466437922380316683>, the <:5p:466437922732769290> would be safer.",
    "nagare": "Nagare is a word for luck, or flow. A player winning a lot has good nagare.",
    "shanten": "Shanten is how far your hand is from tenpai. Tenpai would be 0-shanten, and then it goes up from there.",
    "ukeire": "Ukeire is the number of tiles that decrease your hand's shanten.",
    "iishanten": "A hand that's one tile away from tenpai.",
    "ryanshanten": "A hand that's two tiles away from tenpai.",
    "nobetan": "A nobetan shape is when you're waiting on one of two tiles to become the pair for your hand, such as <:2s:466437921663352842><:3s:466437922258681869><:4s:466437922527248384><:5s:466437922258812929>.",
    "yonrenkei": "A yonrenkai is a run of four in your hand. It could become a nobetan, or be seen as two ryanmen.",
    "nakabukure": "A nakabukure, or bulging shape, is a run with an extra tile in the middle, like <:2s:466437921663352842><:3s:466437922258681869><:3s:466437922258681869><:4s:466437922527248384>. This could be a run, or it could be two ryanmen.",
    "hatsu": "The green dragon. <:6z:466437922317402143>",
    "chun": "The red dragon. <:7z:466437922279784469>",
    "haku": "The white dragon. <:5z:466437921550106625>",
    "ton": "The east wind. <:1z:466437921688518656>",
    "nan": "The south wind. <:2z:466437922594226187>",
    "naan": "A type of leavened flatbread, usually round. Often paired with hummus.",
    "sha": "The west wind. <:3z:466437922560671744>",
    "pei": "The north wind. <:4z:466437922518728744>",
    "menzen": "Closed.",
    "menzentsumo": "Menzen tsumo is a yaku awarded for drawing your winning tile while your hand is closed. Worth one han.",
    "pinfu": "Pinfu is a yaku for a hand which scores no extra fu points, aside from those for tsumo and ron. This means the hand has only runs, a pair that isn't yakuhai, and the final wait was a ryanmen. Must be closed, and is worth one han.\nExample: <:1m:466437920698531841><:2m:466437921550106627><:3m:466437922577580052><:4m:466437922556608522><:5m:466437922401419274><:6m:466437922556739584><:6p:466437922393030657><:7p:466437922980102144><:9p:466437922854404106><:9p:466437922854404106><:3s:466437922258681869><:4s:466437922527248384><:5s:466437922258812929>",
    "sanshoku": "Sanshoku doujun is a yaku for having the same run in each suit. Worth two han closed, and one han open.\nExample: <:1m:466437920698531841><:1m:466437920698531841><:1m:466437920698531841><:5m:466437922401419274><:6m:466437922556739584><:7m:466437922250555393><:5p:466437922732769290><:6p:466437922393030657><:7p:466437922980102144><:5s:466437922258812929><:6s:466437922586099723><:7s:466437922632105984><:6z:466437922317402143><:6z:466437922317402143>",
    "iipeikou": "Iipeikou is a yaku for having two identical runs, such as <:2s:466437921663352842><:2s:466437921663352842><:3s:466437922258681869><:3s:466437922258681869><:4s:466437922527248384><:4s:466437922527248384>. Must be closed, and is worth one han.",
    "dora": "The dora is a bonus tile, one greater than the dora indicator. This wraps around, so <:9m:466437922430648330> as indicator makes <:1m:466437920698531841> dora. Each one gives you an extra han, but they don't count as a yaku. The order for honors is <:1z:466437921688518656>-><:2z:466437922594226187>-><:3z:466437922560671744>-><:4z:466437922518728744>-><:1z:466437921688518656>, and <:5z:466437921550106625>-><:6z:466437922317402143>-><:7z:466437922279784469>-><:5z:466437921550106625>.",
    "ura": "Ura dora indicators are the tile(s) under the dora indicator(s), which create ura dora. Revealed when a player who is in riichi wins the round, and act the same as regular dora.",
    "aka": "Aka means red. Akadora are the red tiles, <:0m:466442879880134657><:0s:466441485542359042><:0p:466442879930466316>, that each grant one han, but do not count as yaku.",
    "ittsu": "Ittsu is a yaku awarded when you have a full straight from one to nine in a single suit. Worth two han closed, and one han open.\nExample: <:1m:466437920698531841><:2m:466437921550106627><:3m:466437922577580052><:1p:466437920908378113><:2p:466437922669985823><:3p:466437922426716161><:4p:466437922401550337><:5p:466437922732769290><:6p:466437922393030657><:7p:466437922980102144><:8p:466437922380316683><:9p:466437922854404106><:7s:466437922632105984><:7s:466437922632105984>",
    "yakuhai": "Yakuhai are the value tiles. The three dragons are always yakuhai, along with the round wind and your seat wind. If you have a triplet of a yakuhai tile, it counts as a yaku, and awards one han per triplet. If you have a triplet of the wind that is both the round wind and your seat wind, you get two han.",
    "dabuton": "Double East. When the dealer has a triplet of <:1z:466437921688518656> during the East round.",
    "chanta": "Chanta is a yaku awarded for having every set in your hand involve a terminal or honor, with at least one run. Worth two han closed, or one han open.\nExample: <:1m:466437920698531841><:2m:466437921550106627><:3m:466437922577580052><:9m:466437922430648330><:9m:466437922430648330><:9m:466437922430648330><:1p:466437920908378113><:1p:466437920908378113><:1s:466437921893908480><:2s:466437921663352842><:3s:466437922258681869><:2z:466437922594226187><:2z:466437922594226187><:2z:466437922594226187>",
    "rinshan": "The rinshan tile is the tile you draw when you declare a kan. If you win on it, you score the rinshan kaihou yaku, and are awarded an extra han.",
    "chankan": "Chankan is a yaku awarded for winning on a tile an opponent added to a triplet to make a kan. Worth one han. On Majsoul, you can chankan on a closed kan if you have a kokushi tenpai.",
    "haitei": "The haitei tile is the last tile in the wall. If you win by drawing it, you score the haitei yaku, and gain a han.",
    "houtei": "Houtei is a yaku awarded for winning on the last possible discard. Grants one han.",
    "ryanpeikou": "Ryanpeikou is a yaku awarded when you have iipeikou twice in the same hand. Worth three han closed, and can't be open. Doesn't stack with iipeikou.\nExample: <:5p:466437922732769290><:5p:466437922732769290><:6p:466437922393030657><:6p:466437922393030657><:7p:466437922980102144><:7p:466437922980102144><:2s:466437921663352842><:2s:466437921663352842><:3s:466437922258681869><:3s:466437922258681869><:4s:466437922527248384><:4s:466437922527248384><:3z:466437922560671744><:3z:466437922560671744>",
    "chinitsu": "Chinitsu is a yaku awarded when all the tiles in your hand are from the same suit. It can be hard to read sometimes. Worth six han closed, and five open.\nExample: <:1s:466437921893908480><:2s:466437921663352842><:3s:466437922258681869><:3s:466437922258681869><:4s:466437922527248384><:5s:466437922258812929><:5s:466437922258812929><:5s:466437922258812929><:6s:466437922586099723><:7s:466437922632105984><:8s:466437922380316673><:9s:466437922850209792><:9s:466437922850209792><:9s:466437922850209792>",
    "nagashi": "Nagashi mangan is a special kind of draw that happens when the games goes to an exhaustive draw while you have only discarded honors and terminals, and nobody has called from you. Counts as scoring a mangan, but not as winning, if that makes sense. The round repeats if the dealer was tenpai.",
    "chiitoitsu": "Chiitoitsu is an exceptional yaku granted when your hand consists of seven pairs. Worth two han, and always scores 25 fu. Has to be closed, obviously. Also, the pairs usually can't be duplicated.\nExample: <:1m:466437920698531841><:1m:466437920698531841><:3m:466437922577580052><:3m:466437922577580052><:9m:466437922430648330><:9m:466437922430648330><:2s:466437921663352842><:2s:466437921663352842><:0s:466441485542359042><:5s:466437922258812929><:2z:466437922594226187><:2z:466437922594226187><:7z:466437922279784469><:7z:466437922279784469>",
    "sanshokudoukou": "Sanshoku doukou is a yaku awarded for having the same triplet in each suit. Worth two han.\nExample: <:2m:466437921550106627><:3m:466437922577580052><:4m:466437922556608522><:9m:466437922430648330><:9m:466437922430648330><:9m:466437922430648330><:9p:466437922854404106><:9p:466437922854404106><:9p:466437922854404106><:9s:466437922850209792><:9s:466437922850209792><:9s:466437922850209792><:1z:466437921688518656><:1z:466437921688518656>",
    "sanankou": "Sanankou is a yaku awarded for having three concealed triplets (or kans) in your hand. Worth two han. The rest of your hand can be open.\nExample: <:4m:466437922556608522><:5m:466437922401419274><:6m:466437922556739584><:6m:466437922556739584><:6m:466437922556739584><:6m:466437922556739584><:4p:466437922401550337><:4p:466437922401550337><:4p:466437922401550337><:9s:466437922850209792><:9s:466437922850209792><:9s:466437922850209792><:1z:466437921688518656><:1z:466437921688518656>",
    "sankantsu": "Sankantsu is a yaku awarded for having three kans. Worth two han.\nExample: <:2s:466437921663352842><:2s:466437921663352842><:6p:466437922393030657><:7p:466437922980102144><:8p:466437922380316683><:tileBack:466437984216940544><:6m:466437922556739584><:6m:466437922556739584><:tileBack:466437984216940544><:tileBack:466437984216940544><:4p:466437922401550337><:4p:466437922401550337><:tileBack:466437984216940544><:tileBack:466437984216940544><:1z:466437921688518656><:1z:466437921688518656><:tileBack:466437984216940544>",
    "toitoi": "Toitoi is a yaku awarded for having four triplets (or kans) and one pair. Worth two han.\nExample: <:2m:466437921550106627><:2m:466437921550106627><:2m:466437921550106627><:6m:466437922556739584><:6m:466437922556739584><:6m:466437922556739584><:4p:466437922401550337><:4p:466437922401550337><:4p:466437922401550337><:9s:466437922850209792><:9s:466437922850209792><:9s:466437922850209792><:1z:466437921688518656><:1z:466437921688518656>",
    "honitsu": "Honitsu is a yaku awarded for having all your number tiles be from the same suit. Honors are okay, too. Worth three han closed, or two han open.\nExample: <:1p:466437920908378113><:2p:466437922669985823><:3p:466437922426716161><:4p:466437922401550337><:5p:466437922732769290><:6p:466437922393030657><:6p:466437922393030657><:6p:466437922393030657><:7p:466437922980102144><:7p:466437922980102144><:7p:466437922980102144><:6z:466437922317402143><:6z:466437922317402143><:6z:466437922317402143>",
    "shousangen": "Shousangen is a yaku awarded for having two dragon triplets and a pair of the third dragon. Worth four han, or two han plus the two han from the dragon triplets, depending on ruleset. Either way, it scores the same.\nExample: <:3p:466437922426716161><:4p:466437922401550337><:5p:466437922732769290><:5s:466437922258812929><:5s:466437922258812929><:5s:466437922258812929><:5z:466437921550106625><:5z:466437921550106625><:6z:466437922317402143><:6z:466437922317402143><:6z:466437922317402143><:7z:466437922279784469><:7z:466437922279784469><:7z:466437922279784469>",
    "honroutou": "Honroutou is a yaku awarded for having only terminals and honors in your hand. Worth two han.\nExample: <:1m:466437920698531841><:1m:466437920698531841><:1m:466437920698531841><:1p:466437920908378113><:1p:466437920908378113><:1p:466437920908378113><:9s:466437922850209792><:9s:466437922850209792><:9s:466437922850209792><:2z:466437922594226187><:2z:466437922594226187><:2z:466437922594226187><:7z:466437922279784469><:7z:466437922279784469>",
    "junchan": "Junchan is a yaku awarded for every set in your hand include a terminal, with at least one run. Worth three han closed, or two han open.\nExample: <:9m:466437922430648330><:9m:466437922430648330><:9m:466437922430648330><:1p:466437920908378113><:1p:466437920908378113><:1p:466437920908378113><:1p:466437920908378113><:2p:466437922669985823><:3p:466437922426716161><:1s:466437921893908480><:1s:466437921893908480><:7s:466437922632105984><:8s:466437922380316673><:9s:466437922850209792>",
    "kokushi": "Kokushi is an exceptional yakuman awarded for having one of each terminal and honor in your hand, plus one paired. If you have one of each but no pair, it's a double yakuman if you win in some rulesets, such as on Majsoul.\nExample: <:1m:466437920698531841><:9m:466437922430648330><:1p:466437920908378113><:9p:466437922854404106><:1s:466437921893908480><:9s:466437922850209792><:1z:466437921688518656><:2z:466437922594226187><:3z:466437922560671744><:3z:466437922560671744><:4z:466437922518728744><:5z:466437921550106625><:6z:466437922317402143><:7z:466437922279784469>",
    "chuuren": "Chuuren is a yakuman awarded for having 1112345678999 in a single suit, plus one of any other tile in that suit. Must be closed. If you're just waiting for the extra tile, it's a double yakuman on some rulesets, such as Majsoul's.\nExample: <:1p:466437920908378113><:1p:466437920908378113><:1p:466437920908378113><:2p:466437922669985823><:3p:466437922426716161><:4p:466437922401550337><:5p:466437922732769290><:6p:466437922393030657><:6p:466437922393030657><:7p:466437922980102144><:8p:466437922380316683><:9p:466437922854404106><:9p:466437922854404106><:9p:466437922854404106>",
    "tenhou": "Tenhou is a yakuman awarded for winning on your first draw as the dealer. It could also be referring to the online platform named Tenhou. `!platform Tenhou`",
    "chihou": "Chihou is a yakuman awarded for winning on your first draw as a non-dealer. If a call happens before you draw, you can't score this.",
    "renhou": "Renhou is a yaku or yakuman awarded for winning off a discard before you've drawn your first tile. Most rulesets have this being worth a mangan or not counting as a yaku at all. If a call happens before you win, you can't score this.",
    "suuankou": "Suuankou is a yakuman awarded for having four concealed triplets. If you have a shanpon wait, and win by ron, it doesn't count, as that final triplet technically counts as being open, even though your hand is closed. Lots of rules, huh? Here's another: if it's a tanki wait, then it counts as a double yakuman in some rulesets, such as on Majsoul.\nExample: <:2m:466437921550106627><:2m:466437921550106627><:2m:466437921550106627><:5m:466437922401419274><:5m:466437922401419274><:5m:466437922401419274><:4p:466437922401550337><:4p:466437922401550337><:6s:466437922586099723><:6s:466437922586099723><:6s:466437922586099723><:7s:466437922632105984><:7s:466437922632105984><:7s:466437922632105984>",
    "suukantsu": "Suukantsu is a yakuman awarded for having four kans. They can be open. The rarest of all yakuman.\nExample: <:4p:466437922401550337><:4p:466437922401550337><:tileBack:466437984216940544><:2m:466437921550106627><:2m:466437921550106627><:tileBack:466437984216940544><:tileBack:466437984216940544><:5m:466437922401419274><:5m:466437922401419274><:tileBack:466437984216940544><:tileBack:466437984216940544><:6s:466437922586099723><:6s:466437922586099723><:tileBack:466437984216940544><:tileBack:466437984216940544><:7s:466437922632105984><:7s:466437922632105984><:tileBack:466437984216940544>",
    "ryuuiisou": "Ryuuiisou is a yakuman awarded for having a hand that consists only of <:2s:466437921663352842><:3s:466437922258681869><:4s:466437922527248384><:6s:466437922586099723><:8s:466437922380316673><:6z:466437922317402143>, the tiles with green and only green. Some rulesets require the hand to include <:6z:466437922317402143>, but Tenhou and Majsoul do not.\nExample: <:2s:466437921663352842><:2s:466437921663352842><:3s:466437922258681869><:3s:466437922258681869><:4s:466437922527248384><:4s:466437922527248384><:6s:466437922586099723><:6s:466437922586099723><:6s:466437922586099723><:8s:466437922380316673><:8s:466437922380316673><:6z:466437922317402143><:6z:466437922317402143><:6z:466437922317402143>",
    "chinroutou": "Chinroutou is a yakuman awarded for having a hand that consists of only terminals.\nExample: <:1m:466437920698531841><:1m:466437920698531841><:1m:466437920698531841><:9m:466437922430648330><:9m:466437922430648330><:9p:466437922854404106><:9p:466437922854404106><:9p:466437922854404106><:1s:466437921893908480><:1s:466437921893908480><:1s:466437921893908480><:9s:466437922850209792><:9s:466437922850209792><:9s:466437922850209792>",
    "tsuuiisou": "Tsuuiisou is a yakuman awarded for having a hand that consists of only honors.\nExample: <:1z:466437921688518656><:1z:466437921688518656><:1z:466437921688518656><:2z:466437922594226187><:2z:466437922594226187><:2z:466437922594226187><:3z:466437922560671744><:3z:466437922560671744><:3z:466437922560671744><:6z:466437922317402143><:6z:466437922317402143><:6z:466437922317402143><:7z:466437922279784469><:7z:466437922279784469>",
    "daisangen": "Daisangen is a yakuman awarded for having a triplet of every dragon.\nExample: <:4p:466437922401550337><:5p:466437922732769290><:6p:466437922393030657><:3s:466437922258681869><:3s:466437922258681869><:5z:466437921550106625><:5z:466437921550106625><:5z:466437921550106625><:6z:466437922317402143><:6z:466437922317402143><:6z:466437922317402143><:7z:466437922279784469><:7z:466437922279784469><:7z:466437922279784469>",
    "daisuushii": "Daisuushii is a yakuman awarded for having a triplet of every wind. In some rulesets, such as on Majsoul, this is a double yakuman.\nExample: <:6s:466437922586099723><:6s:466437922586099723><:1z:466437921688518656><:1z:466437921688518656><:1z:466437921688518656><:2z:466437922594226187><:2z:466437922594226187><:2z:466437922594226187><:3z:466437922560671744><:3z:466437922560671744><:3z:466437922560671744><:4z:466437922518728744><:4z:466437922518728744><:4z:466437922518728744>",
    "shousuushii": "Shousuushii is a yakuman awarded for having three wind triplets and a pair of the fourth wind.\nExample: <:6p:466437922393030657><:6p:466437922393030657><:6p:466437922393030657><:1z:466437921688518656><:1z:466437921688518656><:1z:466437921688518656><:2z:466437922594226187><:2z:466437922594226187><:2z:466437922594226187><:3z:466437922560671744><:3z:466437922560671744><:4z:466437922518728744><:4z:466437922518728744><:4z:466437922518728744>",
    "mawashi": "Mawashi is an advanced technique involving discarding fairly safe tiles while still trying to win the hand.",
    "betaori": "Betaori is when you're only focused on cutting the safest tiles possible, with no regard for winning the hand.",
    "zentsu": "Zentsu is when you're pushing every tile with no regard for how dangerous it is.",
    "oya": "The oya is the dealer.",
    "noten": "Not tenpai.",
    "yamagoshi": "Yamagoshi is when you pass up a win from one player in order to ron on a different player, or tsumo.",
    "tonpu": "Tonpu is the Japanese word for East-only games.",
    "hanchan": "A hanchan is one standard game, with both an East and South round.",
    "sanma": "Sanma is the three-player variant of Riichi Mahjong.",
    "pao": "Sekinin barai, or pao, is a rule where the player who makes a yakuman apparent is responsible for that yakuman. For example, if player A has pons of two dragons, and player B discards the third, and that gets ponned as well, player B is responsible for the daisangen. If player A then tsumos, player B has to pay it all themself, as if they had dealt in. If player A rons a different player, that player and player B split the payment. If multiple yakuman are scored (eg daisangen + tsuuiisou), player B only has to pay for the daisangen, and the other yakuman are paid for as normal. Pao usually only applies for daisangen and daisuushii, though it can sometimes apply for suukantsu and even rinshan kaihou.",
    "sekinin": "Sekinin barai, or pao, is a rule where the player who makes a yakuman apparent is responsible for that yakuman. For example, if player A has pons of two dragons, and player B discards the third, and that gets ponned as well, player B is responsible for the daisangen. If player A then tsumos, player B has to pay it all themself, as if they had dealt in. If player A rons a different player, that player and player B split the payment. If multiple yakuman are scored (eg daisangen + tsuuiisou), player B only has to pay for the daisangen, and the other yakuman are paid for as normal. Pao usually only applies for daisangen and daisuushii, though it can sometimes apply for suukantsu and even rinshan kaihou.",
    "kuikae": "Kuikae in English is usually translated as swap calling. For example, calling chii on a <:2s:466437921663352842> with <:3s:466437922258681869><:4s:466437922527248384><:5s:466437922258812929> in your hand. With this rule, you are not allowed to discard <:5s:466437922258812929>. An easy way to remember it is that you can't discard a tile that would have completed the set you just called. Often, you also cannot cut the same tile that you called. This rule prevents people from avoiding drawing unsafe tiles, and makes yaku like sanshoku or ittsu a bit harder.",
    "houou": "Houou is the top room of Tenhou, where the best players play. It's around the top 1% of Tenhou players. To play in this room, you need to be 7dan or above with over 2000R.",
    "tokujou": "Tokujou is the second highest room of Tenhou. Players at this level usually have very solid efficiency and defense. To play in this room, you need to be 4dan or above with over 1800R.",
    "joukyuu": "Joukyuu is the second room on Tenhou. Most Tenhou players are at this level. To play in this room, you need to be 1kyu or above, or pay for a few months of premium.",
    "ippan": "Ippan is the first room on Tenhou.",
    "agari": "Agari means win. Your agari rate is your win rate, in other words, the number of hands you've won divided by the number of hands you've played.",
    "rentai": "Rentai is the percentage of times you come in either first or second.",
    "tobi": "Tobi means bankruptcy. Your tobi rate is the percentage of games you've ended at below zero points.",
    "keishiki": "*sigh* Keishiki tenpai is when you're tenpai, but you cannot win, due to having no yaku. This is usually done to acquire tenpai payments at the end of the game.",
    "keiten": "Keiten is short for keishiki tenpai, a tenpai hand without the ability to win.",
    "kabe": "A kabe, or a wall, is when you can see all four of a tile. This can be used in defense. If you can see all four <:7p:466437922980102144>, you know they don't have a <:7p:466437922980102144><:8p:466437922380316683> shape, and thus, a <:9p:466437922854404106> could only deal into a tanki or shanpon wait, making it safer.",
    "genbutsu": "A tile that is genbutsu is 100% safe. The most obvious example is the tile your kamicha just discarded, as everyone is furiten on that during your turn.",
    "shimocha": "Your shimocha is the player to your right.",
    "kamicha": "Your kamicha is the player to your left.",
    "toimen": "Your toimen is the player across from you.",
    "0": "When 0 appears in a hand, it means a red five. 0m is <:0m:466442879880134657>, 0s is <:0s:466441485542359042>, and 0p is <:0p:466442879930466316>.",
    "ryankan": "A ryankan shape is two (ryan) kanchans stuck together, like <:4s:466437922527248384><:6s:466437922586099723><:8s:466437922380316673>. This shape accepts eight tiles, same as a ryanmen, but takes up three tiles in the hand instead of two. It's pretty strong, and is usually kept around until all the other blocks in the hand are better.",
    "blocks": "A block in a hand is either a completed set, or a potential set. You usually want five, as a hand needs four sets and a pair to be complete. Check `!link block` for an introduction to five block theory.",
    "karagiri": "Karagiri is when you cut a tile from your hand that you just drew. This can add a bit of mindgames if players are watching where you discard from, but low level players usually won't be doing that.",
    "dama": "Dama is when you're tenpai, and fully closed, but don't call riichi. This increases your winrate, as people won't know to fold, but can decrease your value. See `!link dama` for some guidelines. Damaten and yamiten are shorthands for \"dama tenpai\".",
    "takame": "When your hand has multiple outs that give different values, like a <:7p:466437922980102144><:8p:466437922380316683> shape getting tanyao on <:6p:466437922393030657> but not <:9p:466437922854404106>, the takame is the most valuable out.",
    "yasume": "When your hand has multiple outs that give different values, like a <:7p:466437922980102144><:8p:466437922380316683> shape getting tanyao on <:6p:466437922393030657> but not <:9p:466437922854404106>, the yasume is the least valuable out.",
    "sashikomi": "Sashikomi is when you intentionally try to deal into an opponent. For example, if it's South 4, and you're ahead by 25k points, you might want to deal into 3rd's riichi to end the game before 2nd can catch up with dealer repeats.",
    "ankan": "An ankan is a closed kan.",
    "kannya": "Kannya is what you say when you declare a kan and are also a cat.",
    "ryuukyoku": "Ryuukyoku is an exhaustive draw. When all the tiles are drawn from the wall, and nobody has won.",
    "kyuushu": "Kyuushu kyuuhai is an abortive draw that a player can opt to call if their starting hand has nine or more unique terminals and honors. It must be weighed against the chance of going for kokushi, but kyuushuu is usually the better option if you have less than 11.",
    "aotenjou": "Aotenjou, or skyrocketing, is a ruleset wherein scores are not capped with things like mangan or yakuman. The scores get extremely high, and it's basically never played outside of manga or Touhou games.",
    "wareme": "Wareme is a special rule where the player who has their section of the wall broken has to pay double, the same as the dealer does. This stacks with the dealer's doubled payment. One of the Yakuza games uses this, I think, but it's mostly only a gambling rule.",
    "manzu": "Manzu is the characters suit. You might see tiles written as 1-man <:1m:466437920698531841>.",
    "souzu": "Souzu is the bamboo suit. You might see tiles written as 1-sou <:1s:466437921893908480>.",
    "pinzu": "Pinzu is the circles or dots suit. You might see tiles written as 1-pin <:1p:466437920908378113>.",
    "honba": "Honba are sticks added to the pot after an exhaustive draw or a dealer win. Each one increases the value of a won hand by 300.",
    "efficiency": "Efficiency means focusing on winning the hand as fast as possible, instead of aiming for value. Ukeire, shanten, and upgrades are tools for measuring efficiency, but the hand's shape matters a lot too.",
    "hms": "Hittori Mahjong Simulator is a tool for checking the expected value and speed of a hand, in a tsumo-only environment. Check `!link hms` for more info.",
    "mentsu": "A mentsu is a completed shape in a hand.",
    "taatsu": "A taatsu is a partial shape in a hand. It can be either a pair or a protorun.",
    "toitsu": "A toitsu is a pair.",
    "koutsu": "A koutsu is a triplet.",
    "shuntsu": "A shuntsu is a run.",
    "jantou": "A jantou is a pair, specifically the one you need to complete your hand.",
    "jansou": "A jansou is a Mahjong parlour, where people usually play for money.",
    "shuugi": "A shuugi is a payment that happens between players at a parlour. Generally, each aka dora or ura dora will be a shuugi, but different parlours will have more or less ways to obtain them. When a player tsumos, everyone pays for the shuugi (for example, 500 yen each), while if the player rons, only the ronned player pays (only 500 yen).",
    "<:pyong:274070288474439681>": "A fox-like creature used as Kyuu's avatar. Often used to denote that a statement is intentionally silly. <:pyong:274070288474439681>",
    "<:baka:368258220164251649>": "In the manual for the Touhou game Phantasmagoria of Flower View, the character Cirno is labeled with <:baka:368258220164251649>, and in the notes, it says '<:baka:368258220164251649>: Idiot'. I don't want to make any implications about why people are using it, but you can connect the dots.",
    "doratanki": "A tanki wait on a dora tile.",
    "kuisagari": "Kuisagari is the property of some yaku wherein they lose a han if you score them while open. For example, sanshoku doujun and chanta.",
    "fu": "Fu are minipoints. Your hand gains them for various things, and starts with 20 fu. A triplet gives you 2, times two if it's closed, and times two if it's a terminal or honor, and times four if it's a quad. So, <:tileBack:466437984216940544><:6z:466437922317402143><:6z:466437922317402143><:tileBack:466437984216940544> would give you 32 fu. Additionally, you get two fu if you have a single wait (a tanki, kanchan, or penchan). You also get two fu if your pair is yakuhai, or four fu if it's a double wind. Finally, you get 2 fu if you tsumo, and 10 fu if you win by ron with a closed hand. This is rounded up to the nearest 10, so a 32 fu hand would become a 40 fu hand. The exception to all this is chiitoitsu, which is always 25 fu. Also, if you score pinfu and tsumo, you only get 20 fu. Also also, if a hand scores 20 fu but is open, it goes up to 30 fu due to the open pinfu rule. Phew. Ask something simpler next time.",
    "akagi": "Akagi is a manga/anime/drama about a genius Mahjong player. The anime focuses heavily on the mindgames between players, and the climactic match is played with 3/4 of the tiles being transparent to assist with this theme.",
    "saki": "Saki is a manga/anime about high school girls playing in a Mahjong tournament. It has more of a superpower feel, with each character having unique abilities that influence the game, such as the protagonist, Saki, being able to score rinshan kaihou almost at will.",
    "tetsuya": "Tetsuya is a manga/anime mainly focused on cheating tactics in Mahjong. From wall stacking to teamplay to marked tiles, various characters have different ways of cheating at the game, and they have to try to work around each others' cheats.",
    "tohai": "Tohai is a manga/live action series about a young boy playing Mahjong. The theme is fairly dark, with much of the Mahjong taking place for and around illegal activities.",
    "kirinji": "Tetsunaki no Kirinji is a manga about a high ranked Tenhou player playing in various Mahjong parlours to make a living. The Mahjong in this manga is usually pretty solid, so if you really need to learn Mahjong from a translated manga, this might be your best bet.",
    "koizumi": "Koizumi is a ridiculous Mahjong manga about world leaders playing Mahjong with insane luck. If you want to see the Pope, George Bush, and Putin playing Mahjong, you're in luck.",
    "ten": "Ten could refer to the points in a Mahjong game, or it could be the manga Ten - The Nice Guy on the Path of Tenhou. The manga takes place in the same universe as Akagi, set in the future by a few decades. It has a similar theme as Akagi, but with more cheating.",
    "tenbo": "Tenbo are the point sticks.",
    "uma": "The uma is the point spread. At the end of the game, each player has their score increased or decreased by some amount. For example, on Mahjong Soul, it's +15/+5/-5/-15, which means first place gets an extra 15k points, second gets an extra 5k points, and so on.",
    "oka": "The oka is the difference between the starting score and the target score. Normally, the starting score is 25k, and the target score is 30k. The total difference is 20k (5k per player), and this is granted to first place at the end of the game if oka is used.",
    "yakitori": "Yakitori is a grilled chicken skewer. In Mahjong, it's used to describe a game in which the player never won a hand.",
    "washizu": "Washizu Mahjong is a variant from the manga/anime Akagi. It uses normal Riichi rules, but 3/4 of the tiles are transparent, and tiles are drawn from a bag instead of a wall. It's often played as a 2v2 game.",
    "kuinobashi": "Kuinobashi is when you call a tile to turn a kanchan into a ryanmen. For example, with a 23457 shape, you can call 1 or 4 and discard 7 to end up with a 45 ryanmen. When someone calls, then discards a suji of the called tile, this could be likely.",
    "sakigiri": "Sakigiri is when you cut a tile earlier than efficiency would normally dictate. For example, you might cut a 7 from a 677 shape early on to hide your matagi suji or because you expect the 7 to be dangerous later.",
    "matagi": "Matagi suji refers to tiles within two steps of a tile. It arises from shapes like 677. It's a strong shape, so you'd keep it for later, then when you call riichi, discard the 7 for a 5-8 wait. If it was 778, your wait would be 6-9. So, 5689 are matagi suji. This usually applies to the riichi tile and the last tedashi of an efficient player.",
    "sotogawa": "Sotogawa refers to tiles outside of those discarded early by a player. For example, if they discarded a 3s early on, they likely aren't waiting on 12s. This is because a 233s or 334s shape is pretty strong and would likely be kept.",
    "oikake": "An oikake riichi is a chasing riichi, in other words, one declared after another player has already declared riichi.",
    "zawa": "Zawa is an onomatopoeia in Japanese for getting a chill, often used in Mahjong manga during a tense situation.",
    "pocchi": "Haku pocchi is a special haku that, when drawn while in riichi, counts as a wildcard. Usually only seen in jansou environments.",
    "sujitrap": "A suji trap wait is a wait that looks safe to your opponents due to suji theories. For example, if you have a 5 in your discards, a 13 kanchan would be a suji trap wait, since the 2 is suji of the 5.",
    "trap": "A trap wait is a wait that looks safe in the eyes of the opponents. For example, having a 13 kanchan wait would be a suji trap if you had a 5 in your discards. A tanki on a 9 would be a sotogawa trap if you had an early 7 in your discards, and so on.",
    "otoshi": "Otoshi is used when someone cuts a partial set from their hand. If they cut a 2s from their hand, then cut another 2s from their hand, it would be a toitsu (pair) otoshi. If they cut a 1m from their hand, then a 2m from their hand, it would be a penchan otoshi. These things usually indicate a good wait.",
    "free": "Free play in Mahjong parlours (jansou) refers to going to the parlour and being matched up with others, playing for money.",
    "set": "Set play in Mahjong parlours (jansou) refers to going to the parlour as a group of four and renting a table to play with each other.",
    "anime": "Anime are Japanese animated TV shows. There are a few for Mahjong. There's Akagi, Saki, and Tetsuya as the main ones, and a very short Koizumi anime. You can ask me to define any of those for more info.",
    "manga": "Manga are basically Japanese comics. There are many for Mahjong. The ones I know about with English translations available are Akagi, Saki, Tetsuya, Kirinji, Koizumi, and Tohai. You can ask me to define any of those for more info.",
    "haipai": "A haipai is a starting hand.",
    "daichisei": "Daichisei (big seven stars) is an optional yakuman that is normally not used. It's a combination of tsuuiisou and chiitoitsu, where you have a pair of each honor. When used, it's a double yakuman.\nExample: <:1z:466437921688518656><:1z:466437921688518656><:2z:466437922594226187><:2z:466437922594226187><:3z:466437922560671744><:3z:466437922560671744><:4z:466437922518728744><:4z:466437922518728744><:5z:466437921550106625><:5z:466437921550106625><:6z:466437922317402143><:6z:466437922317402143><:7z:466437922279784469><:7z:466437922279784469>",
    "ishinouenimosannen": "First of all, congratulations on spelling that correctly. Ishinouenimosannen (three years on the stone) is an optional/archaic yakuman scored by declaring double riichi and then winning with haitei.",
    "renchan": "Renchan is the Japanese word for a repeat, such as when the dealer wins a hand.",
    "paarenchan": "Paarenchan is an optional yakuman. You score it when you win as dealer with eight (paa) honba on the table, regardless of your hand's actual value. Some rulesets require the dealer to actually win eight times, with no draws stacking up honba.",
    "sanrenkou": "Sanrenkou is an optional yaku, three connected triplets. You score this when you have three triplets, each one higher in value than the other, in the same suit. It's worth two han, and can be open.",
    "suurenkou": "Suurenkou is an optional yakuman, four connected triplets. You score this when you have four triplets, each one higher in value than the other, in the same suit. It can be open.",
    "shiisanpuutaa": "Shiisanpuutaa is an optional yakuman awarded for someone having a truly awful starting hand. You score this when you have no partial sets in your opening hand after your first draw, aside from one pair. No protoruns, no completed sets, and only one pair.",
    "shiisuupuutaa": "Shiisuupuutaa is an optional yakuman awarded for someone having a truly awful starting hand. You score this when you have no partial sets in your opening hand after drawing your first tile. No pairs, no protoruns, no completed sets.",
    "daisharin": "Daisharin is an optional yakuman awarded for having 22334455667788 in pinzu. It must be closed. Even without the yakuman, it's already tanyao, chinitsu, ryanpeikou, and pinfu for sanbaiman.",
    "daichikurin": "Daichikurin is an optional yakuman awarded for having 22334455667788 in souzu. It must be closed. Even without the yakuman, it's already tanyao, chinitsu, ryanpeikou, and pinfu for sanbaiman.",
    "daisuurin": "Daisuurin is an optional yakuman awarded for having 22334455667788 in manzu. It must be closed. Even without the yakuman, it's already tanyao, chinitsu, ryanpeikou, and pinfu for sanbaiman.",
    "slide": "A slide is when you draw a tile that connects to one of your runs, and discard the opposite end of the run. For example, you could have <:2p:466437922669985823><:3p:466437922426716161><:4p:466437922401550337>, draw <:5p:466437922732769290>, then discard <:2p:466437922669985823>. This is usually done to confirm yaku, such as sanshoku, ittsu, or tanyao, to incorporate a dora, or because the other tile is safer.",
    "karaten": "Karaten, or empty tenpai, is when you're tenpai but don't have the ability to win due to all your tiles being discarded. A karaten riichi is a riichi with no winning tiles available.",
    "machi": "Machi is the Japanese word for \"wait,\" as in the tiles you are waiting on to win.",
    "atamahane": "Atamahane, or head bump, is a rule that has it so, when two or more rons are declared simultaneously, the player whose turn is closest gets the points, while the others get nothing.",
    "bakahon": "Bakahon is a term used when someone wins a hand with only honitsu.",
    "nomi": "Nomi means \"only.\" For example, tanyao nomi is a hand which has tanyao as its only han.",
    "kita": "Kita is the call for revealing a North in sanma. See `!explain sanma`.",
    "nuki": "Nuki dora are the set-aside North tiles in sanma. See `!explain sanma`.",
    "meijin": "Meijin is a term for a Tenhou player who is at 7-dan or higher, but with less than 2000R, and so cannot play in the Houou room.",
    "urasuji": "Ura suji refers to the dangerous tiles that arise from a player upgrading a kanchan to a ryanmen. For example, if you had a 57 kanchan, and drew the 4, you could cut the 7 to wait on 3-6. The 3-6 is the ura suji. This doesn't affect tiles after riichi.",
    "atozuke": "Atozuke is when a player has multiple outs, one of which has no yaku and can't win. For example, having a <:2p:466437922669985823><:3p:466437922426716161> shape where the <:4p:466437922401550337> giving you tanyao is your only yaku. This often comes up with called hands in particular.",
    "enchousen": "Enchousen is the sudden death round. If nobody is over the target score (usually 30k in four player games) by the end of the last hand, and additional round (South for tonpu games, West for hanchan) happens and continues until someone gets over the target score. Generally, only one additional wind round is played, and if nobody is over the target score by the end of it, the game will end.",
    "oorasu": "Oorasu is the Japanese way of saying All Last, the last hand in the normal game. For tonpu, this would be East 4, and for hanchan, it would be South 4.",
    "agariyame": "Agariyame is a rule that lets the dealer end the game when they would normally get a repeat in the last hand of the game, if they are in first place. This is usually allowed, but if it's not, the game will go on until the seats rotate again, letting the dealer stack up as many points as they can gather.",
    "wall": "The wall (yama in Japanese) is the stack of tiles that surrounds the table which players draw from.",
    "deadwall": "The dead wall is the last fourteen tiles in the wall, known as wanpai in Japanese. These are not drawn during the course of the game, except from kans which add another tile to the dead wall from the live wall to compensate.",
    "moupai": "Moupai is the act of reading the face of a drawn tile with your thumb or fingers before looking at it. It's considered bad manners, but players do it often, especially older ones.",
    "goumoupai": "Goumoupai is a fictional Mahjong technique from The Legend of Koizumu, in which you scrape off part of the face of a tile with your thumb to turn it into a different tile.",
    "tsubamegaeshi": "Tsubame gaeshi is a cheating technique in which you stack your wall to have a complete hand along the bottom, then move the top of the wall onto your starting hand and back, leaving you with the stacked tiles to score tenhou or chihou.",
    "ganpai": "Ganpai are marked tiles.",
    "nodocchi": "Nodocchi is a stat tracking website for Tenhou users. For example, https://nodocchi.moe/tenhoulog/#!&name=ASAPIN. It's also a character's online handle in the anime/manga Saki.",
    "musuji": "A musuji tile is a tile which is not suji. A double musuji tile is a middle tile which is not suji on either side.",
    "benikujaku": "Benikujaku is an archaic yakuman which is mostly the opposite of ryuuiisou. It requires your hand to be comprised only of the souzu tiles that have red on them (1579s), plus the red dragon.",
    "ariari": "Shorthand for kuitan ari aka ari, a ruleset where open tanyao is allowed and red fives are used.",
    "bakaze": "The bakaze is the round wind. A triplet of the round wind gives you the yakuhai yaku.",
    "jikaze": "The jikaze is the seat wind. A triplet of your seat wind gives you the yakuhai yaku.",
    "otakaze": "Otakaze are wind tiles that are neither the round wind nor the seat wind. Known as guest winds in English.",
    "yonma": "Yonma means four-player, as opposed to sanma, which is three-player.",
    "shibori": "Shibori is usually called squeeze play in English. It's when you hold onto tiles that you think your shimocha might call to prevent them from winning easily.",
    "shibari": "Shibari means restriction. Ryanhan shibari would be a two-han restriction, which means you need two han from yaku instead of one in order to declare a win. In some rulesets, ryanhan shibari goes into effect starting at five honba. There can also be mangan shibari or anything else.",
    "saburo": "A shorthand for when you're waiting for both a 3 and a 6, usually due to having a 45 ryanmen.",
    "saburokyuu": "A shortahnd for when you're waiting for a 3, 6, or 9, usually due to having a 45678 sanmenchan.",
    "kiriage": "Kiriage mangan is a rule that counts 4 han 30 fu and 3 han 60 fu (both 7700 ron, 7900 tsumo) hands as mangan (8000 ron/tsumo).",
    "kakan": "A kan that was upgraded from a pon.",
    "jankiryuu": "Jankiryuu is a fairly strict ruleset, with such rules as \"You can't discard a dora unless you're tenpai\", \"Don't discard an honor tile as the first tile\", \"You cannot betaori\", and so on. There's an article about it here: https://riichireporter.com/jankiryuu/",
    "ippatsu": "Ippatsu is a yaku awarded when you win on or before your next draw after you riichi, as long as nobody made a call in the meantime. You might also hear ippatsu turn, referring to the time after someone riichis but before they have drawn their next tile. \"Why did I have to draw the dora on the ippatsu turn?\"",
    "iishantenhell": "Iishanten hell is when a player is stuck at one tile away from tenpai, unable to draw a useful tile for many turns.",
    "toitsuba": "A toitsuba is a round in which many pairs are drawn.",
    "paifu": "A paifu is a game record that tracks all the draws and discards each players made. Usually this will just be a replay.",
    "han": "Han are the multipliers for a hand's points, gained from dora and yaku. Each han multiplies your minipoints (fu) by two. There's an implicit two han, known as bazoro, so the base score is fu * (2 ^ (2 + han)), rounded up to the nearest 100.",
    "dorasoba": "A dorasoba is a tile near the dora.",
    "kyoutaku": "Kyoutaku refers to the points on the table, ie the riichi sticks and honba.",
    "buttobi": "Buttobi is the state of being tobi (below zero points).",
    "deadhand": "When you make an error that's severe, but not severe enough to cause the game to be unable to continue, you can be declared to have a dead hand. With a dead hand, you are not allowed to declare a win. Not by ron, not by tsumo. An example of such a mistake could be declaring ron, then realizing you are unable to.",
    "chombo": "When you make an error that prevents the game from continuing, you have to pay a chombo penalty. Sometimes this will be a reverse mangan, where each other player gets as many points as they would have paid you had you won a mangan tsumo. Sometimes it will be 30,000 points removed from your score at the end of the match. An example of this could be declaring a win, revealing your hand, but your hand not being valid.",
    "sokuri": "Sokuri is the Japanese word for insta-riichi.",
    "civilwar": "Civil War is an old yaku from the Western Classical ruleset. It involves having a triplet of norths, a triplet of souths, the numbers 1861 in one suit, and the numbers 1865 in another.",
    "tomato": "Tomato is what people say when someone discards a tile, then a different tile, then the same tile. Example discards: <:3z:466437922560671744><:1p:466437920908378113><:3z:466437922560671744>",
    "toutenkou": "Toutenkou is a special sanma mode popular in Kanto. The scoring is completely different, and it includes the <:5m:466437922401419274> tiles. Most points come from nukidora (gari) and kans rather than yaku, but hands do still need a yaku. More info at http://riichi.wiki/Toutenkou.",
    "gari": "Gari is another word for nukidora, ie, the cut <:4z:466437922518728744> in sanma and the cut <:1m:466437920698531841><:5m:466437922401419274><:9m:466437922430648330> in Toutenkou.",
    "karasu": "Karasu is a bonus in Toutenkou when your hand has no nukidora, no discarded <:4z:466437922518728744><:1m:466437920698531841><:5m:466437922401419274><:9m:466437922430648330>, and none of those tiles in your hand. This adds 20 points if closed (as much as a yakuman), and 10 points if open.",
    "banban": "Banban is a bonus in Toutenkou which adds 2 points to any winning hand.",
    "natsuki": "Natsuki is my name! It's written with the characters 那, which the dictionary defines as \"what?\" and 月, which is \"moon\". The ⓝ is what identifies bots on Tenhou.",
    "sakizumo": "Sakizumo is the act of drawing earlier than the pace of the game dictates. It's bad manners, usually done to minimize the amount of time the other players have to make calls. In extreme cases, can even be drawing your tile before the player before you has discarded.",
    "oyakaburi": "Oyakaburi is the dealer payment in a tsumo. So, \"I got fourth because of baiman oyakaburi\" would mean they were dealer when someone had a baiman tsumo, so they had to pay twice as much as the other players.",
    "shonpai": "A shonpai is a live tile. In other words, one that hasn't been discarded yet.",
    "riichi": "Riichi is the name of the game. When you reach tenpai, you can call riichi, placing a 1000 point stick in the middle as a bet. After this, you can no longer change your hand. If you win, you get the riichi yaku, increasing your han by one, and get to check the uradora indicator.",
    "ura": "The uradora indicator is the tile underneath the dora indicator(s). When a player wins by riichi, they reveal the ura indicators, which create new dora, called uradora.",
    "openriichi": "Open riichi is an optional rule, where when you call riichi, you can reveal your hand or your incomplete shapes. If you win, it counts as two han instead of the one from a normal riichi. If someone who isn't in riichi deals into you, it often counts as yakuman.",
    "suufon": "Suufon renda is an abortive draw that happens when each player discards the same wind in the first round, eg all four first discards being <:3z:466437922560671744> with no calls.",
    "suucha": "Suucha riichi is an abortive draw that happens when all four players declare riichi.",
    "sanchahou": "Sanchahou is an abortive draw that happens when three players call ron on the same tile. Majsoul doesn't use this rule. Sometimes, when a double ron is called, the third player has to reveal their hand to verify that a triple ron wouldn't have happened.",
    "suukaikan": "Suukaikan is an abortive draw that happens when there are four kans declared by different players. If one player calls all four, they are in suukantsu tenpai, and the game continues.",
    "yakuman": "A yakuman is the highest limit a hand can get. As a non-dealer, it's worth 32000 points, and as dealer, it's worth 48000. You get this if you have 13+ hand (kazoe yakuman), or a certain named yakuman, such as Kokushi Musou.",
    "chii": "A chii is a call where you take a tile from the player to your left in order to finish a run. You always place the called tile on the left side, so it might look like <:c4s:667035333640192061><:3s:466437922258681869><:5s:466437922258812929>. Chii could also be used as the word for 'seven' in Mahjong, such as in chiitoitsu, Seven Pairs.",
    "pon": "A pon is a call where you take a tile a player just discarded to finish a triplet. You place the called tile on the left if you called it from the player to your left <:c7z:667035333648449607><:7z:466437922279784469><:7z:466437922279784469>, in the middle if you called it from the player across <:7z:466437922279784469><:c7z:667035333648449607><:7z:466437922279784469>, and on the right if you called it from the player to your right <:7z:466437922279784469><:7z:466437922279784469><:c7z:667035333648449607>",
    "kan": "A kan is a call where you either show that you have four of a kind (closed kan / ankan, looks like <:tileBack:466437984216940544><:3s:466437922258681869><:3s:466437922258681869><:tileBack:466437984216940544>) or you take a tile a player just discarded to complete a four of a kind (daiminkan, looks like a longer pon), or you add a tile you just drew to a pon you've already made (shouminkan / added kan, looks like a pon with two sideways tiles on top of each other). When you do this, you draw a new tile from the end of the deadwall as a replacement. If it's a closed kan, you also immediately reveal a new dora indicator, but if it's an open or added kan, the new indicator is revealed after you discard.",
    "mangan": "A mangan is a hand worth 8000 points as a non-dealer, or 12000 points as the dealer. You score a mangan if you have 5 han, or 4 han 40+ fu, or 3 han 70+ fu. A counted mangan, kiriage mangan, is 4 han 30 fu or 3 han 60 fu, which is worth 7700 ron 7900 tsumo as nondealer. Some rulesets round this up to 8000 for simplicity.",
    "haneman": "A haneman is a hand worth 12000 points as a non-dealer, or 18000 points as the dealer. You score a haneman if you have 6 or 7 han.",
    "baiman": "A baiman, double mangan, is a hand worth 16000 points as a non-dealer, or 24000 points as the dealer. You score a baiman if you have 8, 9, or 10 han.",
    "sanbaiman": "A sanbaiman, triple mangan, is a hand worth 24000 points as a non-dealer, or 36000 points as the dealer. You score a sanbaiman if you have 11 or 12 han. In some rulesets, such as EMA, hands with 13+ han also score sanbaiman instead of being a counted yakuman.",
    "yaku": "A yaku is a winning condition. You need to have one in order to be able to win. You can have multiple yaku, with each contributing their han value to your hand and increasing the value.",
    "onechance": "A one-chance is when you can see three of a tile near another tile. For example, if you can see three of the 2s tiles, there's only one 2s left to make a 23s shape, so the 1s is a one-chance (there's one chance for an opponent to have that ryanmen). If you can see three of the 2s AND three of the 3s, then the 1s is a double one-chance.",
    "nochance": "A no-chance tile is when a tile has no chance of dealing in, due to what tiles you can see. This requires all four of each adjacent tile to be visible, as well as three of the tile itself. In this situation, nobody can be waiting on the tile. Honors are no-chance if three of the honor is already visible, and four of another terminal or honor is visible (to make kokushi impossible).",
    "ankou": "An ankou is a closed triplet, three of the same tile in your hand.",
    "anjun": "An anjun is a closed run.",
    "minkou": "A minkou is a called triplet.",
    "minjun": "A minjun is a called sequence.",
    "ron": "Ron is when a player declares a win on a tile that another player discarded.",
    "dealin": "A deal-in is when a player discards a tile that another player calls ron on.",
    "jihai": "Jihai are honor tiles, the four winds and three dragons.",
    "yaochuu": "Yaochuuhai are the terminal and honor tiles. Ones, nines, winds, and dragons.",
    "aidayonken": "An aida yon ken is when you see two tiles in your opponent's discards with a gap of four tiles between them, for example, 2 and 7. The enclosed ryanmen wait is slightly more dangerous in this case (3-6).",
    "7447": "7447 is the custom Tenhou lobby that is used for friendly matches in the English community.",
    "senki": "Senki suji is the suji two away from a discard. For example, with a 1 discarded, the senki suji would be 3-6. This comes from a player having a 14 shape, cutting the 1, then drawing a 5 to make a ryanmen. This is very minor and not worth thinking about.",
    "ikasama": "Ikasama refers to cheating.",
    "tengo": "Tengo is a gambling rate, where every 1000 points is worth 50 yen.",
    "tenpin": "Tenpin is a gambling rate, where every 1000 points is worth 100 yen.",
    "dekapin": "Dekapin is a gambling rate, where every point is worth 1 yen.",
    "kawashite": "Kawashite is when you aim to win a quick hand to prevent your opponents from winning bigger hands.",
    "nashi": "Nashi is used after rules to indicate that the rule is not enabled. For example, kuitan nashi would mean that tanyao couldn't be scored while open.",
    "ari": "Ari is used after rules to indicate that the rule is enabled. For example, aka ari means there are red fives used.",
    "mentanpin": "Mentanpin is shorthand for Riichi, Tanyao, and Pinfu.",
    "tanpin": "Tanpin is shorthand for Tanyao combined with Pinfu.",
    "mentan": "Mentan is shorthand for Tanyao combined with Riichi.",
    "menhon": "Menhon is shorthand for menzen honitsu, a closed half flush.",
    "menchin": "Menchin is shorthand for menzen chinitsu, a closed full flush.",
    "kanburi": "Kanburi is an archaic yaku awarded for calling ron on the tile a player discards after calling kan, worth one han.",
    "shiiaruraotai": "Shiiaruraotai is an archaic yaku awarded for winning a hand while having four open sets, worth one han.",
    "uumensai": "Uumensai is an archaic yaku awarded for having sets of each type of tile: characters, circles, bamboo, dragons, and winds. Worth two han.",
    "isshokusanjun": "Isshoku sanjun is an archaic yaku awarded for having three of the same run in your hand, similar to iipeikou. Worth three han closed, two han open.",
    "iipinmoyue": "Iipin moyue is an archaic yaku awarded for winning by haitei, when the haitei tile is the <:1p:466437920908378113>. Worth mangan.",
    "chuupinraoyui": "Chuupin raoyui is an archaic yaku awarded for winning by houtei, when the houtei tile is the <:9p:466437922854404106>. Worth mangan.",
    "kuttsuki": "Kuttsuki is sometimes translated as 'sticking' in English. This is when the hand has floating tiles that it's waiting to connect to. For example, <:2m:466437921550106627><:3m:466437922577580052><:4m:466437922556608522><:5m:466437922401419274><:6m:466437922556739584><:7m:466437922250555393><:3s:466437922258681869><:7s:466437922632105984><:2p:466437922669985823><:2p:466437922669985823><:7p:466437922980102144><:8p:466437922380316683><:9p:466437922854404106> is waiting for a tile to connect to the 3 or 7 of bamboo. It could be 159s for a kanchan wait, or 2468s for a ryanmen wait, or 37s for a shanpon wait. 2p also gives a tanki wait. It's a very wide form of iishanten.",
    "uchigiri": "Uchigiri refers to when people cut a block starting from the inside. For example, consider a <:1p:466437920908378113><:3p:466437922426716161> shape. Cutting it starting from the 1 gives more flexibility, as the 3 can evolve to a ryanmen, while cutting it from the 3 gives more safety, as the 1 is a less dangerous tile. When someone cuts a block like this starting from the inside, it might indicate that their hand is already set up well.",
    "ponten": "Ponten can be used in a couple ways. It could refer to an iishanten that can call pon to get to tenpai, or it could refer to the actual act of calling pon to get tenpai.",
    "chiiten": "Chiiten can be used in a couple ways. It could refer to an iishanten that can call chii to get to tenpai, or it could refer to the actual act of calling chii to get tenpai.",
    "kataagari": "Kataagari is when the hand can only win on some tiles. It's similar to atozuke, but only refers to the final hand shape.",
    "poncat": "Poncat refers to a player who calls a lot. It comes from the lower ranks of Mahjong Soul, where many players use the character Ichihime, a catgirl, and call with wild abandon as if it were Chinese Mahjong.",
    "doubleriichi": "Double Riichi is a yaku awarded for declaring riichi on your first discard, as long as nobody has made any calls. It's worth 2 han instead of the 1 han from a regular riichi. In some rulesets, it's 1 han but stacks with riichi instead of replacing it.",
    "sanmentan": "A sanmentan shape is a three-sided tanki wait, like an even longer nobetan. It's formed with seven tiles in a row, such as <:2p:466437922669985823><:3p:466437922426716161><:4p:466437922401550337><:5p:466437922732769290><:6p:466437922393030657><:7p:466437922980102144><:8p:466437922380316683>. This one waits on 258.",
    "jigoku": "A jigoku wait is known as a hell wait in English. In modern times, it refers to when your wait only has one possible out, such as a tanki with 2 visible in the discards.",
    "ii": "Ii is the word for 'one' in Mahjong, such as iishanten, 1-shanten. It could also be the Japanese word for 'good.'",
    "ryan": "Ryan is the word for 'two' in Mahjong, such as in ryanshanten, 2-shanten.",
    "san": "San is the word for 'three' in Japanese, such as in sansou, 3 of bamboo. It's also a polite honorific added to the end of names.",
    "suu": "Suu is the word for 'four' in Mahjong, such as in suuankou, Four Concealed Triplets.",
    "uu": "Uu is the word for 'five' in Mahjong, such as in uumensai, Five Suits Collected.",
    "rou": "Rou is the word for 'six' in Mahjong, such as in saburo, a three-six wait.",
    "paa": "Paa is the word for 'eight' in Mahjong, such as in paarenchan, Eight Repeats.",
    "kyuu": "Kyuu is the word for 'nine' in Mahjong, such as in kyuushukyuuhai, Nine Types Nine Tiles.",
    "jyuu": "Jyuu is the word for 'ten' in Japanese, such as in kokushi musou jyuusanmen machi, Thirteen Orphans Thirteen-Sided Wait",
    "senten": "A senten is a hand which scores 1000 points.",
    "urasan": "Urasan means three ura dora.",
    "nashinashi": "Nashi nashi is shorthand for a ruleset where the two main rules are disallowed. Typically, this would be kuitan nashi and aka nashi. Sometimes a nashi will refer to atozuke nashi.",
    "mochimochi": "Mochimochi is when two players are both waiting on the same paired yakuhai. For example, if both players had <:7z:466437922279784469><:7z:466437922279784469> in their hand.",
    "moshimoshi": "Moshimoshi is what you say when you answer the phone to make sure the other person isn't a fox.",
    "notenbappu": "Noten bappu refers to the payments that players who aren't tenpai at the end of the round have to pay.",
    "fuuro": "A fuuro is a called set.",
    "erb": "<:erb:667161389143687169>",
    "shory": "My future father-in-law.",
    "hai": "Hai is the japanese word for 'tile.' It will sometimes be 'pai' due to rendaku.",
    "rendaku": "You're gonna need to ask a Japanese teacher about that one."
};

const aliases = {
    "kyuushuu": "kyuushu",
    "block": "blocks",
    "kan-nya": "kannya",
    "damaten": "dama",
    "yamiten": "dama",
    "itsu": "ittsu",
    "ittsuu": "ittsu",
    "dokou": "sanshokudokou",
    "hittori": "hms",
    "chiitoi": "chiitoitsu",
    "shaa": "sha",
    "xia": "sha",
    "headbump": "atamahane",
    "tonpuu": "tonpu",
    "tonpuusen": "tonpu",
    "alllast": "oorasu",
    "suddendeath": "encohusen",
    "yama": "wall",
    "wanpai": "deadwall",
    "guestwind": "otakaze",
    "wanzu": "manzu",
    "shichifukusei": "daichisei",
    "shabo": "shanpon",
    "harabote": "nakabukure",
    "bazoro": "han",
    "furikomi": "sashikomi",
    "sokurii": "sokuri",
    "南北戦争": "civilwar",
    "ⓝatsuki": "natsuki",
    "livetile": "shonpai",
    "uradora": "ura",
    "fourwind": "suufon",
    "fourwinds": "suufon",
    "suufonrenda": "suufon",
    "suuchariichi": "suucha",
    "fourriichi": "suucha",
    "tripleron": "sanchahou",
    "fourkan": "suukaikan",
    "fourkans": "suukaikan",
    "minkan": "kan",
    "daiminkan": "kan",
    "shouminkan": "kan",
    "kakan": "kan",
    "kong": "kan",
    "pung": "pon",
    "chow": "chii",
    "fan": "han",
    "fanpai": "yakuhai",
    "fullyconcealedhand": "tsumo",
    "unbroken": "ippatsu",
    "allinside": "tanyao",
    "twinsequences": "iipeikou",
    "puredoublesequence": "iipeikou",
    "puredoublechow": "iipeikou",
    "puretriplechow": "isshokusanjun",
    "isshoku": "isshokusanjun",
    "seatwind": "jikaze",
    "roundwind": "bakaze",
    "dragon": "yakuhai",
    "valuehonour": "yakuhai",
    "valuehonor": "yakuhai",
    "honor": "jihai",
    "honour": "jihai",
    "sevenpairs": "chiitoitsu",
    "chitoitsu": "chiitoitsu",
    "fullstraight": "ittsu",
    "purestraight": "ittsu",
    "mixedsequences": "sanshoku",
    "mixedtriplesequence": "sanshoku",
    "mixedtriplechow": "sanshoku",
    "commonends": "chanta",
    "halfoutsidehand": "chanta",
    "mixedtriplets": "sanshokudokou",
    "tripletriplets": "sanshokudokou",
    "threeconcealedtriplets": "sanankou",
    "threequads": "sankantsu",
    "alltriplets": "toitoi",
    "commonterminals": "honroutou",
    "allterminalsandhonors": "honroutou",
    "allterminalsandhonours": "honroutou",
    "littledragons": "shousangen",
    "littlethreedragons": "shousangen",
    "doubletwinsequences": "ryanpeikou",
    "twicepuredoublesequence": "ryanpeikou",
    "twicepuredoublechow": "ryanpeikou",
    "commonflush": "honitsu",
    "halfflush": "honitsu",
    "perfectends": "junchan",
    "fullyoutsidehand": "junchan",
    "perfectflush": "chinitsu",
    "fullflush": "chinitsu",
    "manganatdraw": "nagashi",
    "thirteenorphans": "kokushi",
    "ninegates": "chuuren",
    "fourconcealedtriplets": "suuankou",
    "fourquads": "suukantsu",
    "allgreen": "ryuuiisou",
    "perfectterminals": "chinroutou",
    "allhonours": "tsuuiisou",
    "allhonors": "tsuuiisou",
    "bigdragons": "daisangen",
    "bigthreedragons": "daisangen",
    "littlewinds": "shousuushii",
    "littlefourwinds": "shousuushii",
    "bigwinds": "daisuushii",
    "bigfourwinds": "daisuushii",
    "singlewaitfourconcealedtriplets": "suuankou",
    "thirteenwaitthirteenorphans": "kokushi",
    "trueninegates": "chuuren",
    "lasttiledraw": "haitei",
    "underthesea": "haitei",
    "lasttileclaim": "houtei",
    "undertheriver": "houtei",
    "afteraquad": "rinshan",
    "afterakan": "rinshan",
    "robbingaquad": "chankan",
    "robbingakan": "chankan",
    "blessingofman": "renhou",
    "blessingofearth": "chihou",
    "blessingofheaven": "tenhou",
    "yaochuuhai": "yaochuu",
    "threechainedtriplets": "sanrenkou",
    "iipinraoyue": "iipinmoyue",
    "iitonmoyue": "iipinmoyue",
    "man": "manzu",
    "m": "manzu",
    "sou": "souzu",
    "s": "souzu",
    "pin": "pinzu",
    "p": "pinzu",
    "daburi": "doubleriichi",
    "daburii": "doubleriichi",
    "shiisuu": "shiisuupuutaa",
    "shiisan": "shiisanpuutaa",
    "hellwait": "jigoku",
    "sanmen": "sanmenchan",
    "nukidora": "nuki",
    "chitoi": "chiitoitsu",
    "tsubame": "tsubamegaeshi",
    "pai": "hai",
}

majsoul_removals = [
    "ippan", "joukyuu", "tokujou", "houou", "meijin", "nodocchi", "7447", "natsuki", "akagi", "saki", "tetsuya", "tohai", "kirinji", "ten"
]

majsoul_edits = {
    "tenhou": "Tenhou is a yakuman awarded for winning on your first draw as the dealer.",
    "ryuuiisou": "Ryuuiisou is a yakuman awarded for having a hand that consists only of <:2s:466437921663352842><:3s:466437922258681869><:4s:466437922527248384><:6s:466437922586099723><:8s:466437922380316673><:6z:466437922317402143>, the tiles with green and only green. Some rulesets require the hand to include <:6z:466437922317402143>, but Mahjong Soul does not.\nExample: <:2s:466437921663352842><:2s:466437921663352842><:3s:466437922258681869><:3s:466437922258681869><:4s:466437922527248384><:4s:466437922527248384><:6s:466437922586099723><:6s:466437922586099723><:6s:466437922586099723><:8s:466437922380316673><:8s:466437922380316673><:6z:466437922317402143><:6z:466437922317402143><:6z:466437922317402143>",
}
