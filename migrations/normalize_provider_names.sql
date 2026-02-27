-- ═══════════════════════════════════════════════════════════════════════════
-- NORMALIZE PROVIDER NAMES in the slots table
-- Standardizes capitalization and uses full official names.
-- Run this in the Supabase SQL Editor.
-- Safe to run multiple times (idempotent — only updates rows that match).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Major Studios ──
UPDATE slots SET provider = 'Pragmatic Play'         WHERE lower(provider) IN ('pragmatic play', 'pragmatic', 'ppgames') AND provider != 'Pragmatic Play';
UPDATE slots SET provider = 'Hacksaw Gaming'         WHERE lower(provider) IN ('hacksaw gaming', 'hacksaw') AND provider != 'Hacksaw Gaming';
UPDATE slots SET provider = 'Nolimit City'           WHERE lower(provider) IN ('nolimit city', 'nolimit', 'nolimitcity', 'no limit city') AND provider != 'Nolimit City';
UPDATE slots SET provider = 'Play''n GO'             WHERE lower(provider) IN ('play''n go', 'playngo', 'playn go', 'play n go') AND provider != 'Play''n GO';
UPDATE slots SET provider = 'Push Gaming'            WHERE lower(provider) IN ('push gaming', 'push') AND provider != 'Push Gaming';
UPDATE slots SET provider = 'Big Time Gaming'        WHERE lower(provider) IN ('big time gaming', 'btg', 'bigtime', 'big time') AND provider != 'Big Time Gaming';
UPDATE slots SET provider = 'ELK Studios'            WHERE lower(provider) IN ('elk studios', 'elk') AND provider != 'ELK Studios';
UPDATE slots SET provider = 'Relax Gaming'           WHERE lower(provider) IN ('relax gaming', 'relax', 'rlx') AND provider != 'Relax Gaming';
UPDATE slots SET provider = 'Red Tiger Gaming'       WHERE lower(provider) IN ('red tiger gaming', 'red tiger', 'redtiger') AND provider != 'Red Tiger Gaming';
UPDATE slots SET provider = 'NetEnt'                 WHERE lower(provider) IN ('netent', 'net ent', 'net entertainment') AND provider != 'NetEnt';
UPDATE slots SET provider = 'Thunderkick'            WHERE lower(provider) IN ('thunderkick') AND provider != 'Thunderkick';
UPDATE slots SET provider = 'Quickspin'              WHERE lower(provider) IN ('quickspin') AND provider != 'Quickspin';
UPDATE slots SET provider = 'Yggdrasil Gaming'       WHERE lower(provider) IN ('yggdrasil gaming', 'yggdrasil') AND provider != 'Yggdrasil Gaming';
UPDATE slots SET provider = 'Blueprint Gaming'       WHERE lower(provider) IN ('blueprint gaming', 'blueprint') AND provider != 'Blueprint Gaming';
UPDATE slots SET provider = 'Evolution'              WHERE lower(provider) IN ('evolution', 'evolution gaming') AND provider != 'Evolution';
UPDATE slots SET provider = 'Playtech'               WHERE lower(provider) IN ('playtech') AND provider != 'Playtech';
UPDATE slots SET provider = 'IGT'                    WHERE lower(provider) IN ('igt', 'international game technology') AND provider != 'IGT';
UPDATE slots SET provider = 'Microgaming'            WHERE lower(provider) IN ('microgaming', 'quickfire', 'games global') AND provider != 'Microgaming';

-- ── A ──
UPDATE slots SET provider = '1spin4win'              WHERE lower(provider) IN ('1spin4win') AND provider != '1spin4win';
UPDATE slots SET provider = '1X2gaming'              WHERE lower(provider) IN ('1x2gaming', '1x2 gaming') AND provider != '1X2gaming';
UPDATE slots SET provider = '18Peaches'              WHERE lower(provider) IN ('18peaches') AND provider != '18Peaches';
UPDATE slots SET provider = '2by2 Gaming'            WHERE lower(provider) IN ('2by2 gaming', '2by2') AND provider != '2by2 Gaming';
UPDATE slots SET provider = '3 Oaks Gaming'          WHERE lower(provider) IN ('3 oaks gaming', '3 oaks', '3oaks', 'three oaks') AND provider != '3 Oaks Gaming';
UPDATE slots SET provider = '4ThePlayer'             WHERE lower(provider) IN ('4theplayer', '4 the player') AND provider != '4ThePlayer';
UPDATE slots SET provider = 'Alea'                   WHERE lower(provider) IN ('alea') AND provider != 'Alea';
UPDATE slots SET provider = 'Ainsworth'              WHERE lower(provider) IN ('ainsworth') AND provider != 'Ainsworth';
UPDATE slots SET provider = 'Aiwin Games'            WHERE lower(provider) IN ('aiwin games', 'aiwin') AND provider != 'Aiwin Games';
UPDATE slots SET provider = 'All41 Studios'          WHERE lower(provider) IN ('all41 studios', 'all41') AND provider != 'All41 Studios';
UPDATE slots SET provider = 'AllWaySpin'             WHERE lower(provider) IN ('allwayspin', 'allway spin') AND provider != 'AllWaySpin';
UPDATE slots SET provider = 'Alchemy Gaming'         WHERE lower(provider) IN ('alchemy gaming', 'alchemy') AND provider != 'Alchemy Gaming';
UPDATE slots SET provider = 'Amatic Industries'      WHERE lower(provider) IN ('amatic industries', 'amatic') AND provider != 'Amatic Industries';
UPDATE slots SET provider = 'Amigo Gaming'           WHERE lower(provider) IN ('amigo gaming', 'amigo') AND provider != 'Amigo Gaming';
UPDATE slots SET provider = 'Amusnet'                WHERE lower(provider) IN ('amusnet', 'egt', 'amusnet (egt)', 'amusnet egt') AND provider != 'Amusnet';
UPDATE slots SET provider = 'Apollo Games'           WHERE lower(provider) IN ('apollo games', 'apollo') AND provider != 'Apollo Games';
UPDATE slots SET provider = 'Apparat Gaming'         WHERE lower(provider) IN ('apparat gaming', 'apparat') AND provider != 'Apparat Gaming';
UPDATE slots SET provider = 'Arrows Edge'            WHERE lower(provider) IN ('arrows edge', 'arcade studio') AND provider != 'Arrows Edge';
UPDATE slots SET provider = 'Armadillo Studios'      WHERE lower(provider) IN ('armadillo studios', 'armadillo') AND provider != 'Armadillo Studios';
UPDATE slots SET provider = 'Asia Gaming'            WHERE lower(provider) IN ('asia gaming') AND provider != 'Asia Gaming';
UPDATE slots SET provider = 'AsiaSoft'               WHERE lower(provider) IN ('asiasoft') AND provider != 'AsiaSoft';
UPDATE slots SET provider = 'Authentic Gaming'       WHERE lower(provider) IN ('authentic gaming') AND provider != 'Authentic Gaming';
UPDATE slots SET provider = 'AvatarUX'               WHERE lower(provider) IN ('avatarux', 'avatar ux') AND provider != 'AvatarUX';
UPDATE slots SET provider = 'AZUR Gaming'            WHERE lower(provider) IN ('azur gaming', 'azur') AND provider != 'AZUR Gaming';

-- ── B ──
UPDATE slots SET provider = 'Backseat Gaming'        WHERE lower(provider) IN ('backseat gaming') AND provider != 'Backseat Gaming';
UPDATE slots SET provider = 'Bally''s Interactive'    WHERE lower(provider) IN ('bally''s interactive', 'ballys', 'bally''s') AND provider != 'Bally''s Interactive';
UPDATE slots SET provider = 'Bang Bang Games'        WHERE lower(provider) IN ('bang bang games') AND provider != 'Bang Bang Games';
UPDATE slots SET provider = 'Barcrest'               WHERE lower(provider) IN ('barcrest') AND provider != 'Barcrest';
UPDATE slots SET provider = 'BeSoft Gaming'          WHERE lower(provider) IN ('besoft gaming', 'besoft') AND provider != 'BeSoft Gaming';
UPDATE slots SET provider = 'Belatra Games'          WHERE lower(provider) IN ('belatra games', 'belatra') AND provider != 'Belatra Games';
UPDATE slots SET provider = 'BetGames'               WHERE lower(provider) IN ('betgames', 'betgames.tv') AND provider != 'BetGames';
UPDATE slots SET provider = 'Betixon'                WHERE lower(provider) IN ('betixon') AND provider != 'Betixon';
UPDATE slots SET provider = 'Betsoft Gaming'         WHERE lower(provider) IN ('betsoft gaming', 'betsoft') AND provider != 'Betsoft Gaming';
UPDATE slots SET provider = 'BGaming'                WHERE lower(provider) IN ('bgaming', 'b gaming') AND provider != 'BGaming';
UPDATE slots SET provider = 'Black Cat Games'        WHERE lower(provider) IN ('black cat games') AND provider != 'Black Cat Games';
UPDATE slots SET provider = 'Blitz Gaming'           WHERE lower(provider) IN ('blitz gaming') AND provider != 'Blitz Gaming';
UPDATE slots SET provider = 'Booming Games'          WHERE lower(provider) IN ('booming games', 'booming') AND provider != 'Booming Games';
UPDATE slots SET provider = 'Booongo'                WHERE lower(provider) IN ('booongo') AND provider != 'Booongo';
UPDATE slots SET provider = 'Bragg Gaming Group'     WHERE lower(provider) IN ('bragg gaming group', 'bragg') AND provider != 'Bragg Gaming Group';
UPDATE slots SET provider = 'Bullshark Games'        WHERE lower(provider) IN ('bullshark games', 'bullshark') AND provider != 'Bullshark Games';
UPDATE slots SET provider = 'Boom Master'            WHERE lower(provider) IN ('boom master') AND provider != 'Boom Master';
UPDATE slots SET provider = 'Boom Pot'               WHERE lower(provider) IN ('boom pot') AND provider != 'Boom Pot';

-- ── C ──
UPDATE slots SET provider = 'Caleta Gaming'          WHERE lower(provider) IN ('caleta gaming', 'caleta') AND provider != 'Caleta Gaming';
UPDATE slots SET provider = 'Capecod'                WHERE lower(provider) IN ('capecod') AND provider != 'Capecod';
UPDATE slots SET provider = 'CT Gaming'              WHERE lower(provider) IN ('ct gaming', 'casino technology', 'ct gaming interactive') AND provider != 'CT Gaming';
UPDATE slots SET provider = 'Cayetano Gaming'        WHERE lower(provider) IN ('cayetano gaming', 'cayetano') AND provider != 'Cayetano Gaming';
UPDATE slots SET provider = 'Clawbuster'             WHERE lower(provider) IN ('clawbuster') AND provider != 'Clawbuster';
UPDATE slots SET provider = 'Connective Games'       WHERE lower(provider) IN ('connective games') AND provider != 'Connective Games';
UPDATE slots SET provider = 'Crazy Tooth Studio'     WHERE lower(provider) IN ('crazy tooth studio', 'crazy tooth') AND provider != 'Crazy Tooth Studio';
UPDATE slots SET provider = 'Croco Gaming'           WHERE lower(provider) IN ('croco gaming') AND provider != 'Croco Gaming';

-- ── D ──
UPDATE slots SET provider = 'Design Works Gaming'    WHERE lower(provider) IN ('design works gaming', 'dwg') AND provider != 'Design Works Gaming';
UPDATE slots SET provider = 'DigiWheel'              WHERE lower(provider) IN ('digiwheel') AND provider != 'DigiWheel';
UPDATE slots SET provider = 'Dragon Gaming'          WHERE lower(provider) IN ('dragon gaming') AND provider != 'Dragon Gaming';
UPDATE slots SET provider = 'Dragon Soft'            WHERE lower(provider) IN ('dragon soft', 'dragoonsoft', 'dragoon soft') AND provider != 'Dragon Soft';
UPDATE slots SET provider = 'Dreamtech Gaming'       WHERE lower(provider) IN ('dreamtech gaming', 'dreamtech') AND provider != 'Dreamtech Gaming';

-- ── E ──
UPDATE slots SET provider = 'Endorphina'             WHERE lower(provider) IN ('endorphina') AND provider != 'Endorphina';
UPDATE slots SET provider = 'Espresso Games'         WHERE lower(provider) IN ('espresso games', 'espresso') AND provider != 'Espresso Games';
UPDATE slots SET provider = 'Evoplay Entertainment'  WHERE lower(provider) IN ('evoplay entertainment', 'evoplay') AND provider != 'Evoplay Entertainment';
UPDATE slots SET provider = 'Ezugi'                  WHERE lower(provider) IN ('ezugi') AND provider != 'Ezugi';

-- ── F ──
UPDATE slots SET provider = 'Fa Chai'                WHERE lower(provider) IN ('fa chai') AND provider != 'Fa Chai';
UPDATE slots SET provider = 'Fantasma Games'         WHERE lower(provider) IN ('fantasma games', 'fantasma') AND provider != 'Fantasma Games';
UPDATE slots SET provider = 'Fazi Interactive'       WHERE lower(provider) IN ('fazi interactive', 'fazi') AND provider != 'Fazi Interactive';
UPDATE slots SET provider = 'Four Leaf Gaming'       WHERE lower(provider) IN ('four leaf gaming') AND provider != 'Four Leaf Gaming';
UPDATE slots SET provider = 'Foxium'                 WHERE lower(provider) IN ('foxium') AND provider != 'Foxium';
UPDATE slots SET provider = 'FreeSpin Games'         WHERE lower(provider) IN ('freespin games', 'freespin') AND provider != 'FreeSpin Games';
UPDATE slots SET provider = 'Fugaso'                 WHERE lower(provider) IN ('fugaso') AND provider != 'Fugaso';

-- ── G ──
UPDATE slots SET provider = 'GameArt'                WHERE lower(provider) IN ('gameart', 'game art') AND provider != 'GameArt';
UPDATE slots SET provider = 'Gaming Corps'           WHERE lower(provider) IN ('gaming corps') AND provider != 'Gaming Corps';
UPDATE slots SET provider = 'Gamomat'                WHERE lower(provider) IN ('gamomat') AND provider != 'Gamomat';
UPDATE slots SET provider = 'Givme Games'            WHERE lower(provider) IN ('givme games') AND provider != 'Givme Games';
UPDATE slots SET provider = 'Golden Hero'            WHERE lower(provider) IN ('golden hero') AND provider != 'Golden Hero';
UPDATE slots SET provider = 'Greentube'              WHERE lower(provider) IN ('greentube') AND provider != 'Greentube';

-- ── H ──
UPDATE slots SET provider = 'Habanero'               WHERE lower(provider) IN ('habanero') AND provider != 'Habanero';
UPDATE slots SET provider = 'High 5 Games'           WHERE lower(provider) IN ('high 5 games', 'h5g', 'high5') AND provider != 'High 5 Games';
UPDATE slots SET provider = 'HoGaming'               WHERE lower(provider) IN ('hogaming', 'ho gaming') AND provider != 'HoGaming';

-- ── I ──
UPDATE slots SET provider = 'IGaming Tech'           WHERE lower(provider) IN ('igaming tech', 'igtech') AND provider != 'IGaming Tech';
UPDATE slots SET provider = 'Imagine Live'           WHERE lower(provider) IN ('imagine live') AND provider != 'Imagine Live';
UPDATE slots SET provider = 'inBET Games'            WHERE lower(provider) IN ('inbet games', 'inbet') AND provider != 'inBET Games';
UPDATE slots SET provider = 'iPlay77'                WHERE lower(provider) IN ('iplay77') AND provider != 'iPlay77';
UPDATE slots SET provider = 'iSoftBet'               WHERE lower(provider) IN ('isoftbet', 'i soft bet') AND provider != 'iSoftBet';

-- ── J / K ──
UPDATE slots SET provider = 'Jaywalk Gaming'         WHERE lower(provider) IN ('jaywalk gaming') AND provider != 'Jaywalk Gaming';
UPDATE slots SET provider = 'KA Gaming'              WHERE lower(provider) IN ('ka gaming') AND provider != 'KA Gaming';
UPDATE slots SET provider = 'Kalamba Games'          WHERE lower(provider) IN ('kalamba games', 'kalamba') AND provider != 'Kalamba Games';
UPDATE slots SET provider = 'KIT Studios'            WHERE lower(provider) IN ('kit studios', 'kitsune studios', 'kit') AND provider != 'KIT Studios';

-- ── L ──
UPDATE slots SET provider = 'Leap Gaming'            WHERE lower(provider) IN ('leap gaming') AND provider != 'Leap Gaming';
UPDATE slots SET provider = 'Leander Games'          WHERE lower(provider) IN ('leander games', 'leander') AND provider != 'Leander Games';
UPDATE slots SET provider = 'Light & Wonder'         WHERE lower(provider) IN ('light & wonder', 'light and wonder', 'nextgen gaming', 'nextgen') AND provider != 'Light & Wonder';
UPDATE slots SET provider = 'Lightning Box Games'    WHERE lower(provider) IN ('lightning box games', 'lightning box') AND provider != 'Lightning Box Games';
UPDATE slots SET provider = 'Live88'                 WHERE lower(provider) IN ('live88') AND provider != 'Live88';

-- ── M ──
UPDATE slots SET provider = 'Mancala Gaming'         WHERE lower(provider) IN ('mancala gaming', 'mancala') AND provider != 'Mancala Gaming';
UPDATE slots SET provider = 'Mascot Gaming'          WHERE lower(provider) IN ('mascot gaming', 'mascot') AND provider != 'Mascot Gaming';
UPDATE slots SET provider = 'MGA Games'              WHERE lower(provider) IN ('mga games', 'mga') AND provider != 'MGA Games';
UPDATE slots SET provider = 'Mobilots'               WHERE lower(provider) IN ('mobilots') AND provider != 'Mobilots';

-- ── N ──
UPDATE slots SET provider = 'NetGame Entertainment'  WHERE lower(provider) IN ('netgame entertainment', 'netgame') AND provider != 'NetGame Entertainment';
UPDATE slots SET provider = 'Northern Lights Gaming' WHERE lower(provider) IN ('northern lights gaming', 'northern lights') AND provider != 'Northern Lights Gaming';
UPDATE slots SET provider = 'Novomatic'              WHERE lower(provider) IN ('novomatic') AND provider != 'Novomatic';
UPDATE slots SET provider = 'NowNow Gaming'          WHERE lower(provider) IN ('nownow gaming') AND provider != 'NowNow Gaming';

-- ── O ──
UPDATE slots SET provider = 'Octoplay'               WHERE lower(provider) IN ('octoplay') AND provider != 'Octoplay';
UPDATE slots SET provider = 'Onlyplay'               WHERE lower(provider) IN ('onlyplay') AND provider != 'Onlyplay';
UPDATE slots SET provider = 'Oryx Gaming'            WHERE lower(provider) IN ('oryx gaming', 'oryx') AND provider != 'Oryx Gaming';

-- ── P ──
UPDATE slots SET provider = 'Peter & Sons'           WHERE lower(provider) IN ('peter & sons', 'peter and sons') AND provider != 'Peter & Sons';
UPDATE slots SET provider = 'PG Soft'                WHERE lower(provider) IN ('pg soft', 'pgsoft', 'pocket games soft', 'pocketgames') AND provider != 'PG Soft';
UPDATE slots SET provider = 'Platipus Gaming'        WHERE lower(provider) IN ('platipus gaming', 'platipus') AND provider != 'Platipus Gaming';
UPDATE slots SET provider = 'Playson'                WHERE lower(provider) IN ('playson') AND provider != 'Playson';
UPDATE slots SET provider = 'PopiPlay'               WHERE lower(provider) IN ('popiplay') AND provider != 'PopiPlay';
UPDATE slots SET provider = 'Print Studios'          WHERE lower(provider) IN ('print studios') AND provider != 'Print Studios';
UPDATE slots SET provider = 'Prowin Gaming'          WHERE lower(provider) IN ('prowin gaming') AND provider != 'Prowin Gaming';

-- ── Q / R ──
UPDATE slots SET provider = 'Qora Gaming'            WHERE lower(provider) IN ('qora gaming') AND provider != 'Qora Gaming';
UPDATE slots SET provider = 'ReelPlay'               WHERE lower(provider) IN ('reelplay', 'reel play') AND provider != 'ReelPlay';
UPDATE slots SET provider = 'ReelNRG'                WHERE lower(provider) IN ('reelnrg', 'reel nrg') AND provider != 'ReelNRG';
UPDATE slots SET provider = 'RubyPlay'               WHERE lower(provider) IN ('rubyplay', 'ruby play') AND provider != 'RubyPlay';
UPDATE slots SET provider = 'Rng Foundry'            WHERE lower(provider) IN ('rng foundry') AND provider != 'Rng Foundry';

-- ── S ──
UPDATE slots SET provider = 'SG Digital'             WHERE lower(provider) IN ('sg digital', 'scientific games') AND provider != 'SG Digital';
UPDATE slots SET provider = 'Slotmill'               WHERE lower(provider) IN ('slotmill', 'slot mill') AND provider != 'Slotmill';
UPDATE slots SET provider = 'Spadegaming'            WHERE lower(provider) IN ('spadegaming', 'spade gaming') AND provider != 'Spadegaming';
UPDATE slots SET provider = 'Spinomenal'             WHERE lower(provider) IN ('spinomenal') AND provider != 'Spinomenal';
UPDATE slots SET provider = 'Spribe'                 WHERE lower(provider) IN ('spribe') AND provider != 'Spribe';
UPDATE slots SET provider = 'Stakelogic'             WHERE lower(provider) IN ('stakelogic') AND provider != 'Stakelogic';
UPDATE slots SET provider = 'Stormcraft Studios'     WHERE lower(provider) IN ('stormcraft studios', 'stormcraft') AND provider != 'Stormcraft Studios';
UPDATE slots SET provider = 'Swintt'                 WHERE lower(provider) IN ('swintt') AND provider != 'Swintt';
UPDATE slots SET provider = 'SYNOT Games'            WHERE lower(provider) IN ('synot games', 'synot') AND provider != 'SYNOT Games';
UPDATE slots SET provider = 'Skywind Group'          WHERE lower(provider) IN ('skywind group', 'skywind') AND provider != 'Skywind Group';

-- ── T ──
UPDATE slots SET provider = 'Tom Horn Gaming'        WHERE lower(provider) IN ('tom horn gaming', 'tom horn') AND provider != 'Tom Horn Gaming';
UPDATE slots SET provider = 'TaDa Gaming'            WHERE lower(provider) IN ('tada gaming', 'tada') AND provider != 'TaDa Gaming';
UPDATE slots SET provider = 'TrueLab Game Studios'   WHERE lower(provider) IN ('truelab game studios', 'truelab') AND provider != 'TrueLab Game Studios';
UPDATE slots SET provider = 'Tontine Gaming'         WHERE lower(provider) IN ('tontine gaming') AND provider != 'Tontine Gaming';

-- ── U / V ──
UPDATE slots SET provider = 'Urgent Games'           WHERE lower(provider) IN ('urgent games') AND provider != 'Urgent Games';
UPDATE slots SET provider = 'Upgaming'               WHERE lower(provider) IN ('upgaming') AND provider != 'Upgaming';
UPDATE slots SET provider = 'UrsaGames'              WHERE lower(provider) IN ('ursagames', 'ursa games') AND provider != 'UrsaGames';
UPDATE slots SET provider = 'Vela Gaming'            WHERE lower(provider) IN ('vela gaming') AND provider != 'Vela Gaming';

-- ── W ──
UPDATE slots SET provider = 'Wazdan'                 WHERE lower(provider) IN ('wazdan') AND provider != 'Wazdan';
UPDATE slots SET provider = 'WinFast Games'          WHERE lower(provider) IN ('winfast games', 'winfast') AND provider != 'WinFast Games';
UPDATE slots SET provider = 'Wizard Games'           WHERE lower(provider) IN ('wizard games', 'wizard') AND provider != 'Wizard Games';

-- ── Y / Z ──
UPDATE slots SET provider = 'ZeusPlay'               WHERE lower(provider) IN ('zeusplay', 'zeus play') AND provider != 'ZeusPlay';
UPDATE slots SET provider = 'Zillion Games'          WHERE lower(provider) IN ('zillion games') AND provider != 'Zillion Games';
UPDATE slots SET provider = 'Zitro Digital'          WHERE lower(provider) IN ('zitro digital', 'zitro') AND provider != 'Zitro Digital';


-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFY: Check distinct provider names after normalization
-- ═══════════════════════════════════════════════════════════════════════════
-- SELECT provider, COUNT(*) as slot_count
-- FROM slots
-- GROUP BY provider
-- ORDER BY provider;
