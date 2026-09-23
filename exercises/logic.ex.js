/* ── "הִגָּיוֹן 🧠" — logic questions (logical thinking, in vowelled Hebrew) ─────
   Its own game category (mode 'logic', medium tier) AND woven into Superman +
   אַלּוּפָה (two cards per game, at the 6th and 14th question). Seven KINDS,
   each a multiple-choice card: TAP an option to select, press ✓ to SUBMIT (the
   story_quiz / cloze / rhyme flow).

     who   מִי אֲנִי?          2–3 clues ("יֵשׁ לִי אַרְבַּע רַגְלַיִם. אֲנִי עוֹשֶׂה מְיָאוּ.")
                               + 3 picture options. Every distractor FITS some
                               clues but is ruled out by exactly one clue (`no`)
                               — the dog has four legs too, but it says הַב.
     odd   מִי לֹא שַׁיָּךְ?     4 pictures, three share a category/attribute.
     ord   מִי הֲכִי ...?      two comparisons → order three (transitivity).
     pat   מָה בָּא אַחַר כָּךְ?  a repeating row (read right→left) + a ❓ slot.
     rule  "אִם... אָז"         a general rule + a fact → the conclusion (and the
                               elimination form: "…וְהוּא לֹא תַּפּוּחַ").
     ana   מָה מַתְאִים?       analogy: A goes with B, so C goes with…?
                               ("עַל הַיָּד שָׂמִים כְּפָפָה, עַל הָרֶגֶל שָׂמִים…").
     then  מָה יִקְרֶה?        cause → effect ("שָׁכַחְנוּ גְּלִידָה בַּשֶּׁמֶשׁ…").

   THE LESSON IS ELIMINATION. A wrong pick is not just "try again": the option is
   CROSSED OUT (✗, disabled) and — for `who` — the clue that rules it out LIGHTS
   UP, so she sees *why* it can't be. After solving, `why` explains the answer.

   Problem: { t:TLG, k, title, lines:[…], q, row?:[…], opts:[{e,w,no?}], a, why }
   (a = 1-based correct option → num1, the report's "correct"). Options are
   shuffled per card. Each kind has a NO-REPEAT shuffled-queue rotation.

   UNAMBIGUITY (the cloze/rhyme lesson — never two valid answers):
   • who: all three options share ONE grammatical gender (the clues speak in the
     answer's gender — "אֲנִי נוֹתֶנֶת חָלָב" would give a masculine option away),
     and every distractor names the clue index that rules it out.
   • odd: the three that belong share something the fourth clearly lacks, and
     there is no second 3-vs-1 split (no "plane, bird, butterfly vs fish" —
     that also splits alive/not-alive).
   • ord: the answer is NOT always the first- or last-named person.
   • pat: the row is periodic; the next item follows from the period (checked
     by a test), distractors come from the row itself so she must use the rule.
   Emoji are Emoji ≤5.0 (Windows 10). Clue text has NO emoji (no picture clue).
   Interactive: mounted by core.js _colxMount into #colx-root; aidsReveal 'always'. */
window.EXERCISES=window.EXERCISES||{};window.EXERCISES.types=window.EXERCISES.types||{};
window.EXERCISES.types.logic=(()=>{

  const sh=a=>{for(let i=a.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[a[i],a[j]]=[a[j],a[i]];}return a;};
  // option shorthand: O(emoji, word, gender, ruledOutByClue)
  const O=(e,w,g,no)=>({e,w,g,no});

  /* ── WHO AM I — opts[0] is the answer; each distractor carries `no` = the
     index of the clue that rules it out. All options: the SAME gender. */
  const WHO=[
    {lines:['יֵשׁ לִי אַרְבַּע רַגְלַיִם.','אֲנִי עוֹשֶׂה מְיָאוּ.'],
     opts:[O('🐱','חָתוּל','m'),O('🐶','כֶּלֶב','m',1),O('🐓','תַּרְנְגוֹל','m',0)]},
    {lines:['יֵשׁ לִי אַרְבַּע רַגְלַיִם.','אֲנִי נוֹבֵחַ: הַב הַב!'],
     opts:[O('🐶','כֶּלֶב','m'),O('🐱','חָתוּל','m',1),O('🦆','בַּרְוָז','m',0)]},
    {lines:['יֵשׁ לִי אַרְבַּע רַגְלַיִם.','אֲנִי נוֹתֶנֶת חָלָב.','אֲנִי עוֹשָׂה מוּ.'],
     opts:[O('🐄','פָּרָה','f'),O('🐑','כִּבְשָׂה','f',2),O('🐔','תַּרְנְגֹלֶת','f',0)]},
    {lines:['אֲנִי גָּר בַּמַּיִם.','אֵין לִי רַגְלַיִם.'],
     opts:[O('🐟','דָּג','m'),O('🦆','בַּרְוָז','m',1),O('🐍','נָחָשׁ','m',0)]},
    {lines:['יֵשׁ לִי כְּנָפַיִם.','יֵשׁ לִי מַקּוֹר וְנוֹצוֹת.'],
     opts:[O('🐦','צִפּוֹר','f'),O('🐝','דְּבוֹרָה','f',1),O('🐄','פָּרָה','f',0)]},
    {lines:['אֲנִי חַיָּה גְּדוֹלָה מְאוֹד.','יֵשׁ לִי חֶדֶק אָרֹךְ.'],
     opts:[O('🐘','פִּיל','m'),O('🦁','אַרְיֵה','m',1),O('🐭','עַכְבָּר','m',0)]},
    {lines:['יֵשׁ לִי אַרְבַּע רַגְלַיִם.','יֵשׁ לִי צַוָּאר אָרֹךְ מְאוֹד.'],
     opts:[O('🦒','גִ׳ירָפָה','f'),O('🦓','זֶבְּרָה','f',1),O('🐔','תַּרְנְגֹלֶת','f',0)]},
    {lines:['אֲנִי פְּרִי.','אֲנִי אָדֹם וְעָגֹל.'],
     opts:[O('🍎','תַּפּוּחַ','m'),O('🍐','אַגָּס','m',1),O('⚽','כַּדּוּר','m',0)]},
    {lines:['אֲנִי בַּשָּׁמַיִם.','אֲנִי מְאִירָה בַּיּוֹם.','אֲנִי חַמָּה מְאוֹד.'],
     opts:[O('☀️','שֶׁמֶשׁ','f'),O('🌙','לְבָנָה','f',1),O('💡','מְנוֹרָה','f',0)]},
    {lines:['אֲנִי בַּשָּׁמַיִם.','אֲנִי מְאִירָה בַּלַּיְלָה.'],
     opts:[O('🌙','לְבָנָה','f'),O('☀️','שֶׁמֶשׁ','f',1),O('💡','מְנוֹרָה','f',0)]},
    {lines:['אֲנִי שׁוֹאֵג בְּקוֹל חָזָק.','יֵשׁ לִי רַעְמָה גְּדוֹלָה.'],
     opts:[O('🦁','אַרְיֵה','m'),O('🐯','נָמֵר','m',1),O('🐴','סוּס','m',0)]},
    {lines:['אֲנִי טָס בַּשָּׁמַיִם.','יֵשׁ בִּי מָקוֹם לְהַרְבֵּה אֲנָשִׁים.'],
     opts:[O('✈️','מָטוֹס','m'),O('🦋','פַּרְפַּר','m',1),O('🚌','אוֹטוֹבּוּס','m',0)]},
    {lines:['אֲנִי קוֹפֶצֶת.','אֲנִי יְרֻקָּה.','אֲנִי עוֹשָׂה קְוָה קְוָה.'],
     opts:[O('🐸','צְפַרְדֵּעַ','f'),O('🐰','אַרְנֶבֶת','f',1),O('🐛','תּוֹלַעַת','f',0)]},
    {lines:['יֵשׁ לִי כְּנָפַיִם.','אֲנִי מְזַמְזֶמֶת.','אֲנִי מְכִינָה דְּבַשׁ.'],
     opts:[O('🐝','דְּבוֹרָה','f'),O('🐦','צִפּוֹר','f',1),O('🐜','נְמָלָה','f',0)]},
    {lines:['אֲנִי מְטַפֵּס עַל עֵצִים.','אֲנִי אוֹהֵב לֶאֱכֹל בָּנָנוֹת.'],
     opts:[O('🐒','קוֹף','m'),O('🐿️','סְנָאִי','m',1),O('🐟','דָּג','m',0)]},
    {lines:['אֵין לִי רַגְלַיִם.','אֲנִי זוֹחֵל עַל הָאֲדָמָה.'],
     opts:[O('🐍','נָחָשׁ','m'),O('🐟','דָּג','m',1),O('🐶','כֶּלֶב','m',0)]},
    {lines:['יֵשׁ לִי שְׁתֵּי רַגְלַיִם.','בַּבֹּקֶר אֲנִי קוֹרֵא: קוּקוּרִיקוּ!'],
     opts:[O('🐓','תַּרְנְגוֹל','m'),O('🦆','בַּרְוָז','m',1),O('🐱','חָתוּל','m',0)]},
    {lines:['אֲנִי שׂוֹחֶה בַּמַּיִם.','יֵשׁ לִי מַקּוֹר.'],
     opts:[O('🦆','בַּרְוָז','m'),O('🐟','דָּג','m',1),O('🐓','תַּרְנְגוֹל','m',0)]},
    {lines:['אֲנִי קָטָן מְאוֹד.','אֲנִי אוֹהֵב לֶאֱכֹל גְּבִינָה.'],
     opts:[O('🐭','עַכְבָּר','m'),O('🦋','פַּרְפַּר','m',1),O('🐘','פִּיל','m',0)]},
    {lines:['אֲנִי עָגֹל.','בּוֹעֲטִים בִּי בַּמִּגְרָשׁ.'],
     opts:[O('⚽','כַּדּוּר','m'),O('🍎','תַּפּוּחַ','m',1),O('📖','סֵפֶר','m',0)]},
    {lines:['אֲנִי הוֹלֵךְ לְאַט מְאוֹד.','יֵשׁ לִי אַרְבַּע רַגְלַיִם.','אֲנִי מַכְנִיס אֶת הָרֹאשׁ לְתוֹךְ הַשִּׁרְיוֹן.'],
     opts:[O('🐢','צָב','m'),O('🐌','חִלָּזוֹן','m',1),O('🐴','סוּס','m',0)]},
    {lines:['בּוֹנִים אוֹתִי בַּחֹרֶף.','אֲנִי עָשׂוּי מִשֶּׁלֶג.'],
     opts:[O('⛄','אִישׁ שֶׁלֶג','m'),O('🏰','אַרְמוֹן חוֹל','m',1),O('🐻','דּוֹב','m',0)]},
    {lines:['אֲנִי בַּשָּׁמַיִם.','אֲנִי לָבָן וְרַךְ.','מִמֶּנִּי יוֹרֵד גֶּשֶׁם.'],
     opts:[O('☁️','עָנָן','m'),O('✈️','מָטוֹס','m',1),O('🐑','כֶּבֶשׂ','m',0)]},
    {lines:['יֵשׁ לִי כְּנָפַיִם צִבְעוֹנִיּוֹת.','פַּעַם הָיִיתִי זַחַל.'],
     opts:[O('🦋','פַּרְפַּר','m'),O('✈️','מָטוֹס','m',1),O('🐟','דָּג','m',0)]},
    {lines:['יֵשׁ לִי אַרְבָּעָה גַּלְגַּלִּים.','אֲנִי נוֹסַעַת עַל הַכְּבִישׁ.'],
     opts:[O('🚗','מְכוֹנִית','f'),O('🚆','רַכֶּבֶת','f',1),O('⛵','סִירָה','f',0)]},
    {lines:['אֲנִי גָּדוֹל וְשָׂעִיר.','אֲנִי אוֹהֵב לֶאֱכֹל דְּבַשׁ.','בַּחֹרֶף אֲנִי יָשֵׁן הַרְבֵּה.'],
     opts:[O('🐻','דּוֹב','m'),O('🦁','אַרְיֵה','m',1),O('🐭','עַכְבָּר','m',0)]},
    {lines:['אֲנִי אֲדֻמָּה וַעֲגֻלָּה.','שָׂמִים אוֹתִי בַּסָּלָט.'],
     opts:[O('🍅','עַגְבָנִיָּה','f'),O('🍪','עֻגִיָּה','f',0),O('🌶️','פִּלְפֶּלֶת','f',0)]},
    {lines:['אֲנִי צִפּוֹר.','אֲנִי לֹא עָף.','אֲנִי חַי בְּמָקוֹם קַר מְאוֹד.'],
     opts:[O('🐧','פִּינְגְּוִין','m'),O('🦉','יַנְשׁוּף','m',1),O('🐓','תַּרְנְגוֹל','m',2)]},
    {lines:['אֲנִי גָּר בַּיָּם.','אֲנִי עֲנָק — הֲכִי גָּדוֹל בָּעוֹלָם!','אֲנִי מַתִּיז מַיִם מֵהָרֹאשׁ.'],
     opts:[O('🐳','לִוְיָתָן','m'),O('🐟','דָּג','m',1),O('🐘','פִּיל','m',0)]},
    {lines:['יֵשׁ לִי שְׁמוֹנֶה רַגְלַיִם.','אֲנִי טוֹוָה קוּרִים.'],
     opts:[O('🕷️','עַכָּבִישׁ','m'),O('🐙','תְּמָנוּן','m',1),O('🦋','פַּרְפַּר','m',0)]},
    {lines:['אֲנִי פְּרִי.','אֲנִי יָרֹק מִבַּחוּץ וְאָדֹם מִבִּפְנִים.','אוֹכְלִים אוֹתִי בַּקַּיִץ.'],
     opts:[O('🍉','אֲבַטִּיחַ','m'),O('🍎','תַּפּוּחַ','m',1),O('🥒','מְלָפְפוֹן','m',0)]},
  ];

  /* ── ODD ONE OUT — opts[0] is the one that does NOT belong */
  const ODD=[
    {opts:[O('🚗','מְכוֹנִית'),O('🍎','תַּפּוּחַ'),O('🍌','בָּנָנָה'),O('🍇','עֲנָבִים')],
     why:'תַּפּוּחַ, בָּנָנָה וַעֲנָבִים הֵם פֵּרוֹת — מְכוֹנִית הִיא לֹא פְּרִי!'},
    {opts:[O('✏️','עִפָּרוֹן'),O('🐶','כֶּלֶב'),O('🐱','חָתוּל'),O('🐰','אַרְנָב')],
     why:'כֶּלֶב, חָתוּל וְאַרְנָב הֵם חַיּוֹת — עִפָּרוֹן הוּא לֹא חַיָּה!'},
    {opts:[O('🐟','דָּג'),O('🐦','צִפּוֹר'),O('🦋','פַּרְפַּר'),O('🐝','דְּבוֹרָה')],
     why:'צִפּוֹר, פַּרְפַּר וּדְבוֹרָה עָפִים — דָּג לֹא עָף, הוּא שׂוֹחֶה!'},
    {opts:[O('🐄','פָּרָה'),O('🐟','דָּג'),O('🐙','תְּמָנוּן'),O('🐳','לִוְיָתָן')],
     why:'דָּג, תְּמָנוּן וְלִוְיָתָן חַיִּים בַּיָּם — פָּרָה חַיָּה בַּחַוָּה!'},
    {opts:[O('🍕','פִּיצָה'),O('👕','חֻלְצָה'),O('👖','מִכְנָסַיִם'),O('🧦','גַּרְבַּיִם')],
     why:'חֻלְצָה, מִכְנָסַיִם וְגַרְבַּיִם לוֹבְשִׁים — פִּיצָה אוֹכְלִים!'},
    {opts:[O('🌳','עֵץ'),O('☀️','שֶׁמֶשׁ'),O('🌙','לְבָנָה'),O('⭐','כּוֹכָב')],
     why:'שֶׁמֶשׁ, לְבָנָה וְכוֹכָב נִמְצָאִים בַּשָּׁמַיִם — עֵץ גָּדֵל בָּאֲדָמָה!'},
    {opts:[O('🍋','לִימוֹן'),O('🍓','תּוּת'),O('🍎','תַּפּוּחַ'),O('🍒','דֻּבְדְּבָנִים')],
     why:'כֻּלָּם פֵּרוֹת — אֲבָל תּוּת, תַּפּוּחַ וְדֻבְדְּבָנִים אֲדֻמִּים, וְלִימוֹן צָהֹב!'},
    {opts:[O('🐶','כֶּלֶב'),O('🐔','תַּרְנְגֹלֶת'),O('🦆','בַּרְוָז'),O('🐦','צִפּוֹר')],
     why:'לְתַרְנְגֹלֶת, לְבַרְוָז וּלְצִפּוֹר יֵשׁ שְׁתֵּי רַגְלַיִם וּכְנָפַיִם — לַכֶּלֶב אֵין כְּנָפַיִם!'},
    {opts:[O('🍭','סֻכָּרִיָּה'),O('🥕','גֶּזֶר'),O('🥒','מְלָפְפוֹן'),O('🍅','עַגְבָנִיָּה')],
     why:'גֶּזֶר, מְלָפְפוֹן וְעַגְבָנִיָּה הֵם יְרָקוֹת — סֻכָּרִיָּה הִיא מַמְתָּק!'},
    {opts:[O('🍞','לֶחֶם'),O('🎸','גִּיטָרָה'),O('🎺','חֲצוֹצְרָה'),O('🥁','תֹּף')],
     why:'גִּיטָרָה, חֲצוֹצְרָה וְתֹף מְנַגְּנִים — לֶחֶם אוֹכְלִים!'},
    {opts:[O('⛵','סִירָה'),O('🚲','אוֹפַנַּיִם'),O('🚗','מְכוֹנִית'),O('🚌','אוֹטוֹבּוּס')],
     why:'אוֹפַנַּיִם, מְכוֹנִית וְאוֹטוֹבּוּס נוֹסְעִים עַל גַּלְגַּלִּים — סִירָה שָׁטָה בַּמַּיִם!'},
    {opts:[O('🐭','עַכְבָּר'),O('🐘','פִּיל'),O('🦒','גִ׳ירָפָה'),O('🦁','אַרְיֵה')],
     why:'פִּיל, גִ׳ירָפָה וְאַרְיֵה הֵם חַיּוֹת גְּדוֹלוֹת — עַכְבָּר קָטָן!'},
    {opts:[O('❄️','שֶׁלֶג'),O('🔥','אֵשׁ'),O('☀️','שֶׁמֶשׁ'),O('☕','תֵּה חַם')],
     why:'אֵשׁ, שֶׁמֶשׁ וְתֵה חַם הֵם חַמִּים — שֶׁלֶג קַר!'},
    {opts:[O('🍞','לֶחֶם'),O('🥛','חָלָב'),O('💧','מַיִם'),O('🍹','מִיץ')],
     why:'חָלָב, מַיִם וּמִיץ שׁוֹתִים — לֶחֶם אוֹכְלִים!'},
    {opts:[O('🐘','פִּיל'),O('🐝','דְּבוֹרָה'),O('🐜','נְמָלָה'),O('🐞','חִפּוּשִׁית')],
     why:'דְּבוֹרָה, נְמָלָה וְחִפּוּשִׁית הֵם חֲרָקִים קְטַנִּים — פִּיל הוּא חַיָּה עֲנָקִית!'},
    {opts:[O('🍄','פִּטְרִיָּה'),O('🌷','צִבְעוֹנִי'),O('🌻','חַמָּנִיָּה'),O('🌹','וֶרֶד')],
     why:'צִבְעוֹנִי, חַמָּנִיָּה וְוֶרֶד הֵם פְּרָחִים — פִּטְרִיָּה הִיא לֹא פֶּרַח!'},
    {opts:[O('🍴','מַזְלֵג'),O('✏️','עִפָּרוֹן'),O('🖊️','עֵט'),O('🖌️','מִכְחוֹל')],
     why:'בְּעִפָּרוֹן, בְּעֵט וּבְמִכְחוֹל כּוֹתְבִים וּמְצַיְּרִים — בְּמַזְלֵג אוֹכְלִים!'},
    {opts:[O('🐄','פָּרָה'),O('🐯','נָמֵר'),O('🦁','אַרְיֵה'),O('🐱','חָתוּל')],
     why:'נָמֵר, אַרְיֵה וְחָתוּל הֵם מִמִּשְׁפַּחַת הַחֲתוּלִים — פָּרָה לֹא!'},
    {opts:[O('🎈','בַּלּוֹן'),O('🍎','תַּפּוּחַ'),O('🍌','בָּנָנָה'),O('🥕','גֶּזֶר')],
     why:'תַּפּוּחַ, בָּנָנָה וְגֶזֶר אוֹכְלִים — בַּלּוֹן לֹא אוֹכְלִים!'},
  ];

  /* ── ORDER — two comparisons, one question; opts[0] is the answer. The
     answer's position in the story varies (first / middle / last named). */
  const ORD=[
    {lines:['נוֹעָה גְּבוֹהָה מִדָּנָה.','דָּנָה גְּבוֹהָה מִמִּיכַל.'],q:'מִי הֲכִי נְמוּכָה?',
     opts:[O('👧','מִיכַל'),O('👧','נוֹעָה'),O('👧','דָּנָה')],
     why:'מִיכַל נְמוּכָה מִדָּנָה, וְדָנָה נְמוּכָה מִנּוֹעָה — אָז מִיכַל הֲכִי נְמוּכָה!'},
    {lines:['יוֹסִי רָץ מַהֵר יוֹתֵר מֵעוֹמֶר.','עוֹמֶר רָץ מַהֵר יוֹתֵר מֵאִיתַי.'],q:'מִי הֲכִי מָהִיר?',
     opts:[O('👦','יוֹסִי'),O('👦','עוֹמֶר'),O('👦','אִיתַי')],
     why:'יוֹסִי מָהִיר מֵעוֹמֶר, וְעוֹמֶר מָהִיר מֵאִיתַי — אָז יוֹסִי הֲכִי מָהִיר!'},
    {lines:['לְשִׁירָה יֵשׁ יוֹתֵר בֻּבּוֹת מִלְּרוֹנִי.','לְרוֹנִי יֵשׁ יוֹתֵר בֻּבּוֹת מִלְּתָמָר.'],q:'לְמִי יֵשׁ הֲכִי מְעַט בֻּבּוֹת?',
     opts:[O('👧','תָּמָר'),O('👧','שִׁירָה'),O('👧','רוֹנִי')],
     why:'לְתָמָר יֵשׁ פָּחוֹת מִלְּרוֹנִי, וּלְרוֹנִי פָּחוֹת מִלְּשִׁירָה — אָז לְתָמָר הֲכִי מְעַט!'},
    {lines:['הַחֶבֶל הָאָדֹם אָרֹךְ מֵהַחֶבֶל הַכָּחֹל.','הַחֶבֶל הַכָּחֹל אָרֹךְ מֵהַחֶבֶל הַיָּרֹק.'],q:'אֵיזֶה חֶבֶל הֲכִי אָרֹךְ?',
     opts:[O('❤️','הָאָדֹם'),O('💙','הַכָּחֹל'),O('💚','הַיָּרֹק')],
     why:'הָאָדֹם אָרֹךְ מֵהַכָּחֹל, וְהַכָּחֹל אָרֹךְ מֵהַיָּרֹק — אָז הָאָדֹם הֲכִי אָרֹךְ!'},
    {lines:['הֶחָתוּל יָשַׁן יוֹתֵר מֵהַכֶּלֶב.','הַכֶּלֶב יָשַׁן יוֹתֵר מֵהָאַרְנָב.'],q:'מִי יָשַׁן הֲכִי מְעַט?',
     opts:[O('🐰','הָאַרְנָב'),O('🐱','הֶחָתוּל'),O('🐶','הַכֶּלֶב')],
     why:'הָאַרְנָב יָשַׁן פָּחוֹת מֵהַכֶּלֶב, וְהַכֶּלֶב פָּחוֹת מֵהֶחָתוּל — אָז הָאַרְנָב יָשַׁן הֲכִי מְעַט!'},
    {lines:['דָּנִי גָּבוֹהַּ מֵאוֹרִי.','אוֹרִי גָּבוֹהַּ מִגַּל.'],q:'מִי בָּאֶמְצַע?',
     opts:[O('👦','אוֹרִי'),O('👦','דָּנִי'),O('👦','גַּל')],
     why:'אוֹרִי נָמוּךְ מִדָּנִי אֲבָל גָּבוֹהַּ מִגַּל — אָז הוּא בָּאֶמְצַע!'},
    {lines:['נֹגָה קָמָה לִפְנֵי יָעֵל.','יָעֵל קָמָה לִפְנֵי הִילָה.'],q:'מִי קָמָה רִאשׁוֹנָה?',
     opts:[O('👧','נֹגָה'),O('👧','יָעֵל'),O('👧','הִילָה')],
     why:'נֹגָה קָמָה לִפְנֵי יָעֵל, וְיָעֵל לִפְנֵי הִילָה — אָז נֹגָה קָמָה רִאשׁוֹנָה!'},
    {lines:['הַמִּגְדָּל שֶׁל עִדּוֹ גָּבוֹהַּ מֵהַמִּגְדָּל שֶׁל בֶּן.','הַמִּגְדָּל שֶׁל בֶּן גָּבוֹהַּ מֵהַמִּגְדָּל שֶׁל רוֹעִי.'],q:'לְמִי הַמִּגְדָּל הֲכִי נָמוּךְ?',
     opts:[O('👦','רוֹעִי'),O('👦','עִדּוֹ'),O('👦','בֶּן')],
     why:'הַמִּגְדָּל שֶׁל רוֹעִי נָמוּךְ מִשֶּׁל בֶּן, וְשֶׁל בֶּן נָמוּךְ מִשֶּׁל עִדּוֹ — אָז שֶׁל רוֹעִי הֲכִי נָמוּךְ!'},
    {lines:['שִׁירָה צְעִירָה מִמָּאיָה.','מָאיָה צְעִירָה מֵאֲבִיגַיִל.'],q:'מִי הֲכִי גְּדוֹלָה?',
     opts:[O('👧','אֲבִיגַיִל'),O('👧','שִׁירָה'),O('👧','מָאיָה')],
     why:'שִׁירָה וּמָאיָה צְעִירוֹת מֵאֲבִיגַיִל — אָז אֲבִיגַיִל הֲכִי גְּדוֹלָה!'},
    {lines:['הַחֶבֶל הַצָּהֹב קָצָר מֵהַחֶבֶל הַסָּגֹל.','הַחֶבֶל הַסָּגֹל קָצָר מֵהַחֶבֶל הָאָדֹם.'],q:'אֵיזֶה חֶבֶל בָּאֶמְצַע?',
     opts:[O('💜','הַסָּגֹל'),O('💛','הַצָּהֹב'),O('❤️','הָאָדֹם')],
     why:'הַסָּגֹל אָרֹךְ מֵהַצָּהֹב אֲבָל קָצָר מֵהָאָדֹם — אָז הוּא בָּאֶמְצַע!'},
    {lines:['הַתִּיק שֶׁל אֲבִיב כָּבֵד מֵהַתִּיק שֶׁל אֵלָה.','הַתִּיק שֶׁל אֵלָה כָּבֵד מֵהַתִּיק שֶׁל תּוֹם.'],q:'שֶׁל מִי הַתִּיק הֲכִי קַל?',
     opts:[O('🎒','תּוֹם'),O('🎒','אֲבִיב'),O('🎒','אֵלָה')],
     why:'הַתִּיק שֶׁל תּוֹם קַל מִשֶּׁל אֵלָה, וְשֶׁל אֵלָה קַל מִשֶּׁל אֲבִיב — אָז שֶׁל תּוֹם הֲכִי קַל!'},
  ];

  /* ── PATTERN — `row` is shown right→left then a ❓; opts[0] is what comes next */
  const PAT=[
    {row:['🍎','🍌','🍎','🍌','🍎'],opts:[O('🍌'),O('🍎'),O('🍇')]},
    {row:['🐱','🐶','🐶','🐱','🐶','🐶','🐱'],opts:[O('🐶'),O('🐱'),O('🐰')]},
    {row:['⭐','🌙','⭐','🌙','⭐'],opts:[O('🌙'),O('⭐'),O('☀️')]},
    {row:['🔴','🔴','🔵','🔴','🔴','🔵','🔴'],opts:[O('🔴'),O('🔵'),O('⚪')]},
    {row:['🐟','🐟','🐸','🐟','🐟','🐸','🐟','🐟'],opts:[O('🐸'),O('🐟'),O('🐢')]},
    {row:['🌸','🌻','🌷','🌸','🌻','🌷','🌸'],opts:[O('🌻'),O('🌷'),O('🌸')]},
    {row:['2','4','6','8'],num:true,opts:[O('10'),O('9'),O('12')],
     why:'כָּל פַּעַם מוֹסִיפִים 2 — אַחֲרֵי 8 בָּא 10!'},
    {row:['1','3','5','7'],num:true,opts:[O('9'),O('8'),O('10')],
     why:'כָּל פַּעַם מוֹסִיפִים 2 — אַחֲרֵי 7 בָּא 9!'},
    {row:['🍎','🍎','🍌','🍎','🍎','🍌','🍎'],opts:[O('🍎'),O('🍌'),O('🍇')]},
    {row:['☀️','🌙','⭐','☀️','🌙','⭐','☀️','🌙'],opts:[O('⭐'),O('☀️'),O('🌙')]},
    {row:['🐶','🐱','🐭','🐶','🐱','🐭','🐶','🐱'],opts:[O('🐭'),O('🐶'),O('🐱')]},
    {row:['💙','💙','💛','💛','💙','💙','💛','💛','💙'],opts:[O('💙'),O('💛'),O('❤️')]},
    {row:['5','10','15','20'],num:true,opts:[O('25'),O('21'),O('30')],
     why:'כָּל פַּעַם מוֹסִיפִים 5 — אַחֲרֵי 20 בָּא 25!'},
    {row:['10','9','8','7'],num:true,opts:[O('6'),O('5'),O('11')],
     why:'כָּל פַּעַם מוֹרִידִים 1 — אַחֲרֵי 7 בָּא 6!'},
    {row:['🍓','🍓','🍓','🍋','🍓','🍓','🍓','🍋','🍓','🍓'],opts:[O('🍓'),O('🍋'),O('🍇')]},
  ];

  /* ── RULE — a general rule + a fact → the conclusion; opts[0] is the answer */
  const RULE=[
    {lines:['כָּל הַבַּלּוֹנִים שֶׁל נוֹעָה אֲדֻמִּים.','נוֹעָה נָתְנָה לִי בַּלּוֹן.'],q:'אֵיזֶה צֶבַע הַבַּלּוֹן?',
     opts:[O('❤️','אָדֹם'),O('💙','כָּחֹל'),O('💛','צָהֹב')],
     why:'כָּל הַבַּלּוֹנִים שֶׁל נוֹעָה אֲדֻמִּים — אָז גַּם הַבַּלּוֹן שֶׁקִּבַּלְתִּי אָדֹם!'},
    {lines:['בַּגִּנָּה שֶׁל סַבְתָּא כָּל הַפְּרָחִים צְהֻבִּים.','קָטַפְתִּי פֶּרַח מֵהַגִּנָּה שֶׁל סַבְתָּא.'],q:'אֵיזֶה צֶבַע הַפֶּרַח?',
     opts:[O('💛','צָהֹב'),O('❤️','אָדֹם'),O('💜','סָגֹל')],
     why:'כָּל הַפְּרָחִים בַּגִּנָּה צְהֻבִּים — אָז הַפֶּרַח שֶׁקָּטַפְתִּי צָהֹב!'},
    {lines:['כְּשֶׁיּוֹרֵד גֶּשֶׁם, דָּנִי לוֹקֵחַ מִטְרִיָּה.','הַיּוֹם יוֹרֵד גֶּשֶׁם.'],q:'מָה דָּנִי לוֹקֵחַ הַיּוֹם?',
     opts:[O('☂️','מִטְרִיָּה'),O('⚽','כַּדּוּר'),O('🕶️','מִשְׁקְפֵי שֶׁמֶשׁ')],
     why:'בְּכָל פַּעַם שֶׁיּוֹרֵד גֶּשֶׁם דָּנִי לוֹקֵחַ מִטְרִיָּה — וְהַיּוֹם יוֹרֵד גֶּשֶׁם!'},
    {lines:['כָּל הַחֲתוּלִים שֶׁל רוֹנִי שְׁחֹרִים.','מִיצִי הוּא הֶחָתוּל שֶׁל רוֹנִי.'],q:'אֵיזֶה צֶבַע מִיצִי?',
     opts:[O('🖤','שָׁחֹר'),O('🧡','כָּתֹם'),O('💙','כָּחֹל')],
     why:'כָּל הַחֲתוּלִים שֶׁל רוֹנִי שְׁחֹרִים, וּמִיצִי הוּא הֶחָתוּל שֶׁלּוֹ — אָז מִיצִי שָׁחֹר!'},
    {lines:['בַּקֻּפְסָה יֵשׁ רַק תַּפּוּחִים וּבָנָנוֹת.','לָקַחְתִּי פְּרִי מֵהַקֻּפְסָה, וְהוּא לֹא תַּפּוּחַ.'],q:'מָה לָקַחְתִּי?',
     opts:[O('🍌','בָּנָנָה'),O('🍎','תַּפּוּחַ'),O('🍇','עֲנָבִים')],
     why:'בַּקֻּפְסָה יֵשׁ רַק תַּפּוּחִים וּבָנָנוֹת. זֶה לֹא תַּפּוּחַ — אָז זוֹ בָּנָנָה!'},
    {lines:['בַּמְּקָרֵר יֵשׁ רַק חָלָב וּמִיץ.','אִמָּא שָׁתְתָה מַשֶּׁהוּ מֵהַמְּקָרֵר, וְזֶה לֹא חָלָב.'],q:'מָה אִמָּא שָׁתְתָה?',
     opts:[O('🍹','מִיץ'),O('🥛','חָלָב'),O('☕','תֵּה')],
     why:'בַּמְּקָרֵר יֵשׁ רַק חָלָב וּמִיץ. זֶה לֹא חָלָב — אָז זֶה מִיץ!'},
    {lines:['כָּל הַכְּלָבִים נוֹבְחִים.','רֶקְס הוּא כֶּלֶב.'],q:'מָה רֶקְס עוֹשֶׂה?',
     opts:[O('🐶','נוֹבֵחַ'),O('🐱','מְיַלֵּל'),O('🐦','מְצַיֵּץ')],
     why:'כָּל הַכְּלָבִים נוֹבְחִים, וְרֶקְס הוּא כֶּלֶב — אָז רֶקְס נוֹבֵחַ!'},
    {lines:['כָּל הַצִּפּוֹרִים בַּכְּלוּב שֶׁל יוֹנָתָן צְהֻבּוֹת.','צִיצִי הִיא צִפּוֹר מֵהַכְּלוּב שֶׁל יוֹנָתָן.'],q:'אֵיזֶה צֶבַע צִיצִי?',
     opts:[O('💛','צְהֻבָּה'),O('💙','כְּחֻלָּה'),O('💚','יְרֻקָּה')],
     why:'כָּל הַצִּפּוֹרִים בַּכְּלוּב צְהֻבּוֹת, וְצִיצִי מֵהַכְּלוּב — אָז צִיצִי צְהֻבָּה!'},
    {lines:['בַּבַּיִת שֶׁל גַּל יֵשׁ רַק כְּלָבִים.','לְגַל יֵשׁ חַיָּה בַּבַּיִת, וּשְׁמָהּ בּוֹנִי.'],q:'מָה בּוֹנִי?',
     opts:[O('🐶','כֶּלֶב'),O('🐱','חָתוּל'),O('🐟','דָּג')],
     why:'אֵצֶל גַּל יֵשׁ רַק כְּלָבִים — אָז בּוֹנִי הִיא כַּלְבָּה!'},
    {lines:['בְּיוֹם שִׁשִּׁי אֲנַחְנוּ אוֹכְלִים פִּיצָה.','הַיּוֹם יוֹם שִׁשִּׁי.'],q:'מָה נֹאכַל הַיּוֹם?',
     opts:[O('🍕','פִּיצָה'),O('🍝','פַּסְטָה'),O('🥗','סָלָט')],
     why:'בְּיוֹם שִׁשִּׁי אוֹכְלִים פִּיצָה — וְהַיּוֹם יוֹם שִׁשִּׁי!'},
    {lines:['עַל הַשֻּׁלְחָן יֵשׁ רַק כּוֹס, צַלַּחַת וְכַף.','לָקַחְתִּי מֵהַשֻּׁלְחָן דָּבָר אֶחָד — זֶה לֹא כּוֹס וְלֹא צַלַּחַת.'],q:'מָה לָקַחְתִּי?',
     opts:[O('🥄','כַּף'),O('☕','כּוֹס'),O('🍽️','צַלַּחַת')],
     why:'עַל הַשֻּׁלְחָן יֵשׁ רַק שְׁלוֹשָׁה דְּבָרִים. זֶה לֹא כּוֹס וְלֹא צַלַּחַת — אָז זוֹ כַּף!'},
    {lines:['מִי שֶׁגּוֹמֵר אֶת הָאֹכֶל מְקַבֵּל קִנּוּחַ.','יוֹנִי גָּמַר אֶת הָאֹכֶל.'],q:'מָה יוֹנִי יְקַבֵּל?',
     opts:[O('🍰','קִנּוּחַ'),O('🧹','מַטְאֲטֵא'),O('👟','נַעֲלַיִם')],
     why:'מִי שֶׁגּוֹמֵר אֶת הָאֹכֶל מְקַבֵּל קִנּוּחַ — וְיוֹנִי גָּמַר!'},
    {lines:['כָּל הַפֵּרוֹת בַּסַּל שֶׁל מִיכַל צְהֻבִּים.','לָקַחְתִּי פְּרִי מֵהַסַּל שֶׁל מִיכַל.'],q:'אֵיזֶה פְּרִי לָקַחְתִּי?',
     opts:[O('🍌','בָּנָנָה'),O('🍎','תַּפּוּחַ'),O('🍇','עֲנָבִים')],
     why:'כָּל הַפֵּרוֹת בַּסַּל צְהֻבִּים — וְרַק הַבָּנָנָה צְהֻבָּה!'},
    {lines:['בַּגַּן יֵשׁ רַק פַּרְפָּרִים וּדְבוֹרִים.','רָאִיתִי בַּגַּן מַשֶּׁהוּ עָף, וְזֶה לֹא הָיָה פַּרְפַּר.'],q:'מָה רָאִיתִי?',
     opts:[O('🐝','דְּבוֹרָה'),O('🦋','פַּרְפַּר'),O('🐦','צִפּוֹר')],
     why:'בַּגַּן יֵשׁ רַק פַּרְפָּרִים וּדְבוֹרִים. זֶה לֹא פַּרְפַּר — אָז זוֹ דְּבוֹרָה!'},
  ];

  /* ── ANALOGY — the first line is a pair, the second line starts the matching
     pair; opts[0] completes it */
  const ANA=[
    {lines:['עַל הַיָּד שָׂמִים כְּפָפָה.','עַל הָרֶגֶל שָׂמִים...'],
     opts:[O('🧦','גֶּרֶב'),O('🎩','כּוֹבַע'),O('🧣','צָעִיף')],
     why:'כְּפָפָה שׁוֹמֶרֶת עַל הַיָּד, וְגֶרֶב שׁוֹמֵר עַל הָרֶגֶל!'},
    {lines:['בַּיּוֹם מְאִירָה הַשֶּׁמֶשׁ.','בַּלַּיְלָה מְאִירָה...'],
     opts:[O('🌙','הַלְּבָנָה'),O('☁️','הֶעָנָן'),O('🌈','הַקֶּשֶׁת')],
     why:'הַשֶּׁמֶשׁ מְאִירָה בַּיּוֹם, וְהַלְּבָנָה מְאִירָה בַּלַּיְלָה!'},
    {lines:['הַדָּג שׂוֹחֶה בַּמַּיִם.','הַצִּפּוֹר עָפָה...'],
     opts:[O('☁️','בַּשָּׁמַיִם'),O('🌊','בַּיָּם'),O('🕳️','בְּתוֹךְ הָאֲדָמָה')],
     why:'הַדָּג זָז בַּמַּיִם, וְהַצִּפּוֹר זָזָה בַּשָּׁמַיִם!'},
    {lines:['גּוּר הוּא הַתִּינוֹק שֶׁל הַכֶּלֶב.','אֶפְרוֹחַ הוּא הַתִּינוֹק שֶׁל...'],
     opts:[O('🐔','הַתַּרְנְגֹלֶת'),O('🐄','הַפָּרָה'),O('🐱','הֶחָתוּל')],
     why:'מֵהַבֵּיצָה שֶׁל הַתַּרְנְגֹלֶת יוֹצֵא אֶפְרוֹחַ!'},
    {lines:['בְּמִסְפָּרַיִם גּוֹזְרִים.','בְּעִפָּרוֹן...'],
     opts:[O('📝','כּוֹתְבִים'),O('✂️','גּוֹזְרִים'),O('🍴','אוֹכְלִים')],
     why:'מִסְפָּרַיִם הֵם כְּלִי לִגְזֹר, וְעִפָּרוֹן הוּא כְּלִי לִכְתֹּב!'},
    {lines:['בַּחֹרֶף קַר.','בַּקַּיִץ...'],
     opts:[O('☀️','חַם'),O('❄️','קַר מְאוֹד'),O('⛄','יוֹרֵד שֶׁלֶג')],
     why:'חֹרֶף וְקַיִץ הֵם הֲפָכִים — בַּחֹרֶף קַר, וּבַקַּיִץ חַם!'},
    {lines:['הַפָּרָה נוֹתֶנֶת חָלָב.','הַתַּרְנְגֹלֶת נוֹתֶנֶת...'],
     opts:[O('🥚','בֵּיצִים'),O('🍯','דְּבַשׁ'),O('🧀','גְּבִינָה')],
     why:'מֵהַפָּרָה מְקַבְּלִים חָלָב, וּמֵהַתַּרְנְגֹלֶת מְקַבְּלִים בֵּיצִים!'},
    {lines:['בָּעֵינַיִם רוֹאִים.','בָּאָזְנַיִם...'],
     opts:[O('🎵','שׁוֹמְעִים'),O('👀','רוֹאִים'),O('👃','מְרִיחִים')],
     why:'בָּעֵינַיִם רוֹאִים, וּבָאָזְנַיִם שׁוֹמְעִים!'},
    {lines:['הַכֶּלֶב גָּר בִּמְלוּנָה.','הַדְּבוֹרָה גָּרָה...'],
     opts:[O('🍯','בְּכַוֶּרֶת'),O('🌊','בַּיָּם'),O('🏰','בְּאַרְמוֹן')],
     why:'לְכָל חַיָּה יֵשׁ בַּיִת — לַכֶּלֶב מְלוּנָה, וְלַדְּבוֹרָה כַּוֶּרֶת!'},
    {lines:['קָטָן הוּא הַהֵפֶךְ שֶׁל גָּדוֹל.','חַם הוּא הַהֵפֶךְ שֶׁל...'],
     opts:[O('❄️','קַר'),O('🔥','חַם מְאוֹד'),O('☀️','שֶׁמֶשׁ')],
     why:'קָטָן וְגָדוֹל הֵם הֲפָכִים, וְגַם חַם וְקַר!'},
    {lines:['בַּבֹּקֶר אוֹמְרִים: בֹּקֶר טוֹב.','בַּלַּיְלָה אוֹמְרִים...'],
     opts:[O('🌙','לַיְלָה טוֹב'),O('👋','שָׁלוֹם'),O('🎂','יוֹם הֻלֶּדֶת שָׂמֵחַ')],
     why:'בַּבֹּקֶר אוֹמְרִים בֹּקֶר טוֹב, וּבַלַּיְלָה אוֹמְרִים לַיְלָה טוֹב!'},
    {lines:['אֶת הַמָּרָק אוֹכְלִים בְּכַף.','אֶת הַסָּלָט אוֹכְלִים בְּ...'],
     opts:[O('🍴','מַזְלֵג'),O('🥤','קַשִּׁית'),O('✂️','מִסְפָּרַיִם')],
     why:'מָרָק אוֹכְלִים בְּכַף, וְסָלָט אוֹכְלִים בְּמַזְלֵג!'},
    {lines:['הַכֶּלֶב אוֹמֵר הַב.','הַפָּרָה אוֹמֶרֶת...'],
     opts:[O('🐄','מוּ'),O('🐱','מְיָאוּ'),O('🐓','קוּקוּרִיקוּ')],
     why:'לְכָל חַיָּה יֵשׁ קוֹל מִשֶּׁלָּהּ — הַכֶּלֶב עוֹשֶׂה הַב, וְהַפָּרָה עוֹשָׂה מוּ!'},
  ];

  /* ── CAUSE → EFFECT — what happens next; opts[0] is the answer */
  const THEN=[
    {lines:['שָׁכַחְנוּ אֶת הַגְּלִידָה בַּשֶּׁמֶשׁ.'],q:'מָה יִקְרֶה לַגְּלִידָה?',
     opts:[O('💧','הִיא תִּמַּס'),O('❄️','הִיא תִּקְפָּא'),O('🎈','הִיא תָּעוּף')],
     why:'בַּשֶּׁמֶשׁ חַם — וּגְלִידָה נִמֶּסֶת בַּחֹם!'},
    {lines:['הַבַּלּוֹן נָגַע בְּקוֹץ חַד.'],q:'מָה קָרָה לַבַּלּוֹן?',
     opts:[O('💥','הוּא הִתְפּוֹצֵץ'),O('🌱','הוּא גָּדַל'),O('🍰','הוּא נֶאֱפָה')],
     why:'קוֹץ הוּא חַד — וְהוּא מְפוֹצֵץ בַּלּוֹנִים!'},
    {lines:['לֹא הִשְׁקֵינוּ אֶת הַפֶּרַח הַרְבֵּה יָמִים.'],q:'מָה קָרָה לַפֶּרַח?',
     opts:[O('🥀','הוּא נָבַל'),O('🌻','הוּא גָּדַל מְאוֹד'),O('🦋','הוּא עָף')],
     why:'פֶּרַח צָרִיךְ מַיִם — בְּלִי מַיִם הוּא נוֹבֵל!'},
    {lines:['יָצָאנוּ הַחוּצָה בַּגֶּשֶׁם בְּלִי מִטְרִיָּה.'],q:'מָה קָרָה לָנוּ?',
     opts:[O('💦','נִרְטַבְנוּ'),O('🔥','נִשְׂרַפְנוּ'),O('😴','נִרְדַּמְנוּ')],
     why:'הַגֶּשֶׁם יָרַד עָלֵינוּ — וּבְלִי מִטְרִיָּה נִרְטָבִים!'},
    {lines:['כּוֹס זְכוּכִית נָפְלָה עַל הָרִצְפָּה.'],q:'מָה קָרָה לַכּוֹס?',
     opts:[O('💥','הִיא נִשְׁבְּרָה'),O('🌸','הִיא פָּרְחָה'),O('🎵','הִיא שָׁרָה')],
     why:'זְכוּכִית הִיא שְׁבִירָה — כְּשֶׁהִיא נוֹפֶלֶת הִיא נִשְׁבֶּרֶת!'},
    {lines:['שַׂמְנוּ כּוֹס מַיִם בַּמַּקְפִּיא.'],q:'מָה יִקְרֶה לַמַּיִם?',
     opts:[O('❄️','הֵם יִקְפְּאוּ'),O('🔥','הֵם יִרְתְּחוּ'),O('🌈','הֵם יִהְיוּ קֶשֶׁת')],
     why:'בַּמַּקְפִּיא קַר מְאוֹד — וּמַיִם קוֹפְאִים וְנַעֲשִׂים קֶרַח!'},
    {lines:['הִדְלַקְנוּ אֶת הָאוֹר בַּחֶדֶר הֶחָשׁוּךְ.'],q:'מָה קָרָה?',
     opts:[O('💡','נִהְיָה אוֹר בַּחֶדֶר'),O('🌧️','יָרַד גֶּשֶׁם'),O('❄️','נִהְיָה קַר')],
     why:'כְּשֶׁמַּדְלִיקִים אֶת הָאוֹר — הַחֹשֶׁךְ נֶעֱלָם!'},
    {lines:['שָׁתַלְנוּ זֶרַע, וְהִשְׁקֵינוּ אוֹתוֹ כָּל יוֹם.'],q:'מָה יִקְרֶה?',
     opts:[O('🌱','יִצְמַח צֶמַח'),O('🐣','יֵצֵא אֶפְרוֹחַ'),O('🍞','יִהְיֶה לֶחֶם')],
     why:'זֶרַע שֶׁמַּשְׁקִים אוֹתוֹ — צוֹמֵחַ וְנַעֲשֶׂה צֶמַח!'},
    {lines:['הַשָּׁעוֹן הַמְּעוֹרֵר צִלְצֵל בַּבֹּקֶר.'],q:'מָה קָרָה?',
     opts:[O('⏰','הִתְעוֹרַרְנוּ'),O('😴','נִרְדַּמְנוּ'),O('🍽️','אָכַלְנוּ אֲרוּחַת עֶרֶב')],
     why:'הַשָּׁעוֹן הַמְּעוֹרֵר מְצַלְצֵל כְּדֵי שֶׁנִּתְעוֹרֵר!'},
    {lines:['סַבְתָּא שָׂמָה עוּגָה בַּתַּנּוּר הַחַם.'],q:'מָה יִקְרֶה לָעוּגָה?',
     opts:[O('🎂','הִיא תֵּאָפֶה'),O('❄️','הִיא תִּקְפָּא'),O('🌊','הִיא תִּשְׂחֶה')],
     why:'בַּתַּנּוּר הַחַם הָעוּגָה נֶאֱפֵית!'},
    {lines:['שָׁכַחְנוּ לִסְגֹּר אֶת הַבֶּרֶז.'],q:'מָה קָרָה?',
     opts:[O('💦','הַמַּיִם זָרְמוּ'),O('🔥','הִתְחִילָה אֵשׁ'),O('🎈','עָפוּ בַּלּוֹנִים')],
     why:'כְּשֶׁהַבֶּרֶז פָּתוּחַ — הַמַּיִם מַמְשִׁיכִים לִזְרֹם!'},
    {lines:['הֶחָתוּל רָאָה עַכְבָּר.'],q:'מָה עָשָׂה הֶחָתוּל?',
     opts:[O('🐭','רָדַף אַחֲרָיו'),O('🎤','שָׁר לוֹ שִׁיר'),O('📖','קָרָא סֵפֶר')],
     why:'חֲתוּלִים אוֹהֲבִים לִרְדֹּף אַחֲרֵי עַכְבָּרִים!'},
    {lines:['הַשֶּׁמֶשׁ שָׁקְעָה, וְהִגִּיעַ הַלַּיְלָה.'],q:'מָה קָרָה בַּשָּׁמַיִם?',
     opts:[O('🌙','נִהְיָה חֹשֶׁךְ'),O('☀️','נִהְיָה צָהֳרַיִם'),O('🌈','יָצְאָה קֶשֶׁת')],
     why:'כְּשֶׁהַשֶּׁמֶשׁ שׁוֹקַעַת — נִהְיָה חֹשֶׁךְ וּמַגִּיעַ הַלַּיְלָה!'},
  ];

  const KINDS={
    who:{bank:WHO, title:'🔍 מִי אֲנִי?', why:'כָּל הָרְמָזִים מַתְאִימִים!'},
    odd:{bank:ODD, title:'🔎 מִי לֹא שַׁיָּךְ?'},
    ord:{bank:ORD, title:'🧠 חִשְׁבִי וְסַדְּרִי'},
    pat:{bank:PAT, title:'🔁 מָה בָּא אַחַר כָּךְ?', why:'מָצָאתְ אֶת הַחֻקִּיּוּת — מָה שֶׁחוֹזֵר עַל עַצְמוֹ!'},
    rule:{bank:RULE,title:'💡 אִם... אָז...'},
    ana:{bank:ANA, title:'🔗 מָה מַתְאִים?'},
    then:{bank:THEN,title:'⚡ מָה יִקְרֶה?'},
  };
  // how many of each kind one הִגָּיוֹן session holds (15 cards, every kind present)
  const MIX={who:4,odd:2,ord:2,pat:2,rule:2,ana:2,then:1};

  // NO-REPEAT rotation per kind (shuffled queue; a fresh cycle never opens with
  // the item that closed the previous one)
  const _rot={};
  function _next(k){
    const R=_rot[k]||(_rot[k]={q:null,last:-1});
    const bank=KINDS[k].bank;
    if(!R.q||!R.q.length){
      R.q=sh(bank.map((_,i)=>i));
      if(R.q[0]===R.last&&R.q.length>1)R.q.push(R.q.shift());
    }
    R.last=R.q.shift();
    return bank[R.last];
  }
  function makeOne(k,entry){
    const order=sh(entry.opts.map((_,i)=>i));
    return {t:TLG,k,title:KINDS[k].title,lines:(entry.lines||[]).slice(),q:entry.q||'',
            row:entry.row?entry.row.slice():null,num:!!entry.num,
            opts:order.map(i=>({e:entry.opts[i].e,w:entry.opts[i].w||'',no:entry.opts[i].no})),
            a:order.indexOf(0)+1,why:entry.why||KINDS[k].why||''};
  }
  // Superman + אַלּוּפָה get LOGIC_PER_GAME cards per game (problems.js places them
  // at the 6th and 14th question); the kind rotates across games so every kind
  // takes its turn (who is listed twice — it is the flagship kind)
  const LOGIC_PER_GAME=2;
  const WEAVE_KINDS=['who','odd','pat','who','rule','ana','ord','then'];
  let _kc=0;
  function makeWeave(){
    const out=[];
    for(let i=0;i<LOGIC_PER_GAME;i++){
      const k=WEAVE_KINDS[_kc%WEAVE_KINDS.length];_kc++;
      out.push(makeOne(k,_next(k)));
    }
    return out;
  }
  function makePool(){
    const deck=[];
    Object.keys(MIX).forEach(k=>{for(let i=0;i<MIX[k];i++)deck.push(makeOne(k,_next(k)));});
    return sh(deck);
  }

  const CSS=`
  .lg-root{position:relative;display:flex;flex-direction:column;align-items:center;gap:13px;width:100%;max-width:600px;margin:0 auto}
  .lg-title{direction:rtl;text-align:center;font-family:'Fredoka One','Heebo',sans-serif;font-size:1.8rem;
    color:var(--skin-accent,#ffd27d);text-shadow:0 0 10px rgba(255,210,125,.3)}
  .lg-clues{direction:rtl;width:100%;display:flex;flex-direction:column;gap:6px;
    background:rgba(255,255,255,.08);border:2px solid rgba(255,255,255,.18);border-radius:16px;
    padding:12px 16px;animation:lgFade .35s ease}
  @keyframes lgFade{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}
  .lg-clue{font-family:'Fredoka One','Heebo',sans-serif;font-size:1.85rem;line-height:1.55;
    color:var(--skin-text,#fff);display:flex;align-items:center;gap:10px;border-radius:10px;
    padding:1px 8px;transition:background .25s,box-shadow .25s}
  .lg-clue .lg-n{flex-shrink:0;width:30px;height:30px;border-radius:50%;display:inline-flex;align-items:center;
    justify-content:center;font-size:1.05rem;background:rgba(255,255,255,.16);border:1.5px solid rgba(255,255,255,.35)}
  .lg-clue.lg-hit{background:rgba(233,30,99,.18);box-shadow:0 0 0 2px rgba(233,30,99,.55);animation:lgPulse .6s ease 2}
  @keyframes lgPulse{50%{transform:scale(1.02)}}
  .lg-q{direction:rtl;text-align:center;font-family:'Fredoka One','Heebo',sans-serif;font-size:1.9rem;
    color:var(--skin-accent,#ffd27d)}
  .lg-row{direction:rtl;display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:8px;
    background:rgba(255,255,255,.08);border:2px solid rgba(255,255,255,.18);border-radius:16px;padding:12px 14px}
  .lg-row span{font-size:2.5rem;line-height:1;min-width:1.2em;text-align:center;
    font-family:'Fredoka One','Heebo',sans-serif;color:var(--skin-text,#fff)}
  .lg-row .lg-slot{border:2.5px dashed var(--skin-accent,#ffd27d);border-radius:12px;padding:4px 8px;font-size:2.1rem}
  .lg-row .lg-slot.lg-filled{border-style:solid;border-color:#4caf50;background:rgba(76,175,80,.18)}
  .lg-opts{display:flex;gap:12px;justify-content:center;direction:rtl;flex-wrap:wrap}
  .lg-opt{position:relative;min-width:118px;border-radius:18px;cursor:pointer;user-select:none;
    background:rgba(255,255,255,.07);border:2px solid rgba(255,255,255,.25);
    display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;
    padding:10px 10px;transition:transform .12s,border-color .15s,background .15s,box-shadow .15s,opacity .2s}
  .lg-opt:hover{background:rgba(255,255,255,.13)}
  .lg-opt .lg-e{font-size:2.6rem;line-height:1;filter:drop-shadow(0 3px 6px rgba(0,0,0,.3))}
  .lg-opt .lg-w{font-family:'Fredoka One','Heebo',sans-serif;font-size:1.6rem;color:var(--skin-text,#fff)}
  .lg-num .lg-e{font-family:'Fredoka One',cursive;font-size:2.3rem;color:var(--skin-text,#fff);filter:none}
  .lg-opt.lg-sel{border-color:var(--skin-primary,#c77dff);background:rgba(199,125,255,.18);
    box-shadow:0 0 14px rgba(199,125,255,.35);transform:translateY(-2px)}
  .lg-opt.lg-ok{border-color:#4caf50;background:rgba(76,175,80,.2)}
  .lg-opt.lg-err{border-color:#e91e63;background:rgba(233,30,99,.16);animation:lgShake .4s ease}
  @keyframes lgShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}60%{transform:translateX(5px)}}
  .lg-opt.lg-x{opacity:.38;cursor:default;filter:grayscale(.7)}
  .lg-opt.lg-x::after{content:'✗';position:absolute;top:2px;left:8px;font-size:1.5rem;color:#e91e63;font-weight:700}
  .lg-opt.lg-off{opacity:.55;cursor:default}
  .lg-why{display:none;direction:rtl;text-align:center;font-family:'Fredoka One','Heebo',sans-serif;
    font-size:1.5rem;line-height:1.5;color:var(--skin-text,#fff);
    background:rgba(76,175,80,.16);border:1.5px solid rgba(76,175,80,.6);border-radius:14px;padding:7px 15px}
  .lg-why.lg-on{display:block;animation:lgFade .3s ease}
  .lg-chk{font-family:'Fredoka One',cursive;font-size:1.35rem;border:0;border-radius:14px;padding:11px 34px;
    cursor:pointer;color:#fff;background:linear-gradient(160deg,#86E29B,#2FA257 85%);
    border:2px solid rgba(255,255,255,.5);box-shadow:0 3px 0 rgba(0,0,0,.28)}
  .lg-chk:active{transform:translateY(2px);box-shadow:0 1px 0 rgba(0,0,0,.28)}
  .lg-chk:disabled{opacity:.4;cursor:default;box-shadow:none}
  @media(max-width:480px){.lg-clue{font-size:1.5rem}.lg-q{font-size:1.6rem}.lg-row span{font-size:2rem}
    .lg-opt{min-width:92px;padding:8px 6px}.lg-opt .lg-e{font-size:2.1rem}.lg-opt .lg-w{font-size:1.35rem}}`;
  function injectStyle(){
    if(document.getElementById('lg-style'))return;
    const st=document.createElement('style');st.id='lg-style';st.textContent=CSS;
    document.head.appendChild(st);
  }

  const MISS={
    who:'הָרֶמֶז הַמְּסֻמָּן לֹא מַתְאִים לַתְּשׁוּבָה הַזֹּאת — נַסִּי שׁוּב 💗',
    odd:'חִשְׁבִי: מָה מְשֻׁתָּף לְשָׁלוֹשׁ מֵהַתְּמוּנוֹת? 💗',
    ord:'קִרְאִי שׁוּב כָּל מִשְׁפָּט, וְסַדְּרִי אוֹתָם בָּרֹאשׁ 💗',
    ana:'מָה הַקֶּשֶׁר בַּמִּשְׁפָּט הָרִאשׁוֹן? חַפְּשִׂי אוֹתוֹ קֶשֶׁר בַּשֵּׁנִי 💗',
    then:'דַּמְיְנִי שֶׁזֶּה קוֹרֶה בֶּאֱמֶת — מָה יִקְרֶה? 💗',
    pat:'חַפְּשִׂי מָה חוֹזֵר עַל עַצְמוֹ בַּשּׁוּרָה 💗',
    rule:'הַתְּשׁוּבָה מִסְתַּתֶּרֶת בַּמִּשְׁפָּטִים — קִרְאִי שׁוּב 💗',
  };

  let _uid=0;
  function mount(ctx){
    injectStyle();
    const {root,api}=ctx;
    const p=ctx.p||{};
    const k=p.k||'who';
    const opts=p.opts||[];
    const correct=(typeof p.a==='number'&&p.a)||1;
    const uid=++_uid;
    let done=false,picked=0;
    const timers=[];const later=(fn,ms)=>{timers.push(setTimeout(fn,ms));};
    const hint=msg=>{const h=document.getElementById('hint');if(h)h.textContent=msg;};
    const numbered=k==='who';

    let body='';
    if(p.lines&&p.lines.length)
      body+='<div class="lg-clues">'+p.lines.map((l,i)=>
        '<div class="lg-clue" data-c="'+i+'">'+(numbered?'<span class="lg-n">'+(i+1)+'</span>':'')+'<span>'+l+'</span></div>').join('')+'</div>';
    if(p.row)
      body+='<div class="lg-row">'+p.row.map(x=>'<span>'+x+'</span>').join('')+
        '<span class="lg-slot" id="lg-slot-'+uid+'">❓</span></div>';
    if(p.q)body+='<div class="lg-q">'+p.q+'</div>';

    root.innerHTML=
      '<div class="lg-root" data-k="'+k+'">'+
        '<div class="lg-title">'+(p.title||'🧠')+'</div>'+
        body+
        '<div class="lg-opts'+(p.num?' lg-num':'')+'" role="listbox" aria-label="תְּשׁוּבוֹת">'+
          opts.map((o,i)=>'<div class="lg-opt" role="option" data-i="'+(i+1)+'" tabindex="0">'+
            '<span class="lg-e">'+o.e+'</span>'+(o.w?'<span class="lg-w">'+o.w+'</span>':'')+'</div>').join('')+
        '</div>'+
        '<div class="lg-why" id="lg-why-'+uid+'">'+(p.why||'')+'</div>'+
        '<button class="lg-chk" id="lg-chk-'+uid+'" aria-label="הַגָּשָׁה">✓</button>'+
      '</div>';

    const optEls=Array.prototype.slice.call(root.querySelectorAll('.lg-opt'));
    const clueEls=Array.prototype.slice.call(root.querySelectorAll('.lg-clue'));
    const why=root.querySelector('#lg-why-'+uid);
    const slot=root.querySelector('#lg-slot-'+uid);
    const chk=root.querySelector('#lg-chk-'+uid);
    hint('🧠 חִשְׁבִי טוֹב, בַּחֲרִי תְּשׁוּבָה וְלַחֲצִי ✓!');

    function select(i){
      if(done)return;
      const el=optEls[i-1];
      if(!el||el.classList.contains('lg-x'))return;      // crossed out — already ruled out
      picked=i;
      optEls.forEach(o=>o.classList.remove('lg-sel','lg-err'));
      el.classList.add('lg-sel');
    }
    optEls.forEach(el=>{
      el.addEventListener('click',function(){select(+this.getAttribute('data-i'));});
      el.addEventListener('keydown',function(e){
        if(e.key==='Enter'||e.key===' '){e.preventDefault();select(+this.getAttribute('data-i'));}
      });
    });

    function submit(){
      if(done)return;
      if(!picked){hint('בַּחֲרִי תְּשׁוּבָה קֹדֶם — וְאָז לַחֲצִי ✓ 💗');return;}
      const el=optEls[picked-1];
      clueEls.forEach(c=>c.classList.remove('lg-hit'));
      if(picked===correct){
        done=true;
        el.classList.remove('lg-sel');el.classList.add('lg-ok');
        optEls.forEach(o=>{if(o!==el&&!o.classList.contains('lg-x'))o.classList.add('lg-off');});
        if(slot){slot.textContent=opts[correct-1].e;slot.classList.add('lg-filled');}
        if(why&&p.why)why.classList.add('lg-on');
        chk.disabled=true;
        hint('🎉 חָשַׁבְתְּ נָכוֹן! אַתְּ בַּלָּשִׁית אֲמִיתִּית!');
        api.solved();
      }else{
        el.classList.remove('lg-sel');el.classList.add('lg-err');
        const no=opts[picked-1].no;                       // WHO: the clue that rules this one out
        if(typeof no==='number'&&clueEls[no])clueEls[no].classList.add('lg-hit');
        api.wrong(picked);
        hint(MISS[k]||MISS.who);
        const wrongEl=el;picked=0;
        later(()=>{if(!done){wrongEl.classList.remove('lg-err');wrongEl.classList.add('lg-x');}},650);
      }
    }
    chk.addEventListener('click',submit);
    root.addEventListener('keydown',e=>{if(e.key==='Enter'&&!done&&picked){e.preventDefault();submit();}});

    return function cleanup(){timers.forEach(clearTimeout);root.innerHTML='';};
  }

  return{
    t:TLG,
    modes:['logic','sup','mulc'],
    aidsReveal:'always',
    make(mode){return mode==='logic'?makePool():(mode==='sup'||mode==='mulc')?makeWeave():[];},
    _resetRotation(){Object.keys(_rot).forEach(k=>delete _rot[k]);_kc=0;},   // test hook
    _weaveKinds:WEAVE_KINDS,
    _banks:{who:WHO,odd:ODD,ord:ORD,pat:PAT,rule:RULE,ana:ANA,then:THEN},_mix:MIX,           // test hooks
    _makeOne:makeOne,
    mount,
  };
})();
