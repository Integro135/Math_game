/* ── "סִפּוּר וְשְׁאֵלָה" — reading comprehension with a multiple-choice question ──
   A READING exercise (not arithmetic) for Superman (sup) + אַלּוּפָה (mulc): the
   child reads a SHORT vowelled (מְנֻקָּד) story — up to 4 short lines, age-7
   reading level — on one of four topics: חָלָל 🚀 · חַדֵּי קֶרֶן 🦄 ·
   דִּינוֹזָאוּרִים 🦖 · נְסִיכוֹת 👑. Below it, ONE multiple-choice ("אמריקאית")
   question whose answers are ALSO fully vowelled. The child TAPS an answer to
   select it (highlight), then presses the ✓ button to SUBMIT — only then is the
   choice judged: correct → api.solved() (standard try-first scoring), wrong →
   api.wrong(picked) (penalty + sad modal), the choice un-sticks and she picks
   again. Submitting with nothing selected just nudges (no penalty).

   Deck placement: ONE STORY PER 5 EXERCISES (user spec) — makePool('sup'/'mulc')
   in problems.js caps the base deck to 16 and weaves the 4 stories (one per
   TOPIC, so each set covers all four worlds) at slots 5/10/15/20.

   Problem shape: { t:TSQ, topic, emoji, lines:[…≤4], q, opts:[3 vowelled answers],
   a:1-based index of the correct option } (a → num1, so the host report shows
   ✓a / the ✗picks). Options are SHUFFLED per card, so the correct slot varies.
   Interactive: mounted by core.js _colxMount into #colx-root; aidsReveal 'always'
   (no number line / jar — reading has no arithmetic aid). */
window.EXERCISES=window.EXERCISES||{};window.EXERCISES.types=window.EXERCISES.types||{};
window.EXERCISES.types.story_quiz=(()=>{

  const sh=a=>{for(let i=a.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[a[i],a[j]]=[a[j],a[i]];}return a;};

  /* THE LIBRARY — 8 stories per topic (32 total; a BIG pool so the child can't
     memorise answers — user request). Each: ≤4 SHORT vowelled lines (age-7
     reading), one question, 3 vowelled options with `c` = the correct one's index
     here (options are re-shuffled per card, `a` is recomputed). */
  const TOPICS={
    space:{emoji:'🚀',label:'חָלָל'},
    unicorns:{emoji:'🦄',label:'חַדֵּי קֶרֶן'},
    dinos:{emoji:'🦖',label:'דִּינוֹזָאוּרִים'},
    princess:{emoji:'👑',label:'נְסִיכוֹת'},
  };
  const LIB={
    space:[
      {lines:['הַיָּרֵחַ מַקִּיף אֶת כַּדּוּר הָאָרֶץ.','בַּלַּיְלָה הוּא נִרְאֶה גָּדוֹל וּמֵאִיר.','עַל הַיָּרֵחַ יֵשׁ הַרְבֵּה מַכְתְּשִׁים.','אַסְטְרוֹנָאוּטִים כְּבָר בִּקְּרוּ בּוֹ.'],
       q:'אֶת מָה מַקִּיף הַיָּרֵחַ?',
       opts:['אֶת הַשֶּׁמֶשׁ','אֶת כַּדּוּר הָאָרֶץ','אֶת הַכּוֹכָבִים'],c:1},
      {lines:['לַשֶּׁמֶשׁ יֵשׁ שְׁמוֹנָה כּוֹכְבֵי לֶכֶת.','כַּדּוּר הָאָרֶץ הוּא אֶחָד מֵהֶם.','הַגָּדוֹל מִכֻּלָּם הוּא צֶדֶק.','הַקָּרוֹב לַשֶּׁמֶשׁ הוּא כּוֹכָב חַמָּה.'],
       q:'מִי כּוֹכַב הַלֶּכֶת הַגָּדוֹל בְּיוֹתֵר?',
       opts:['צֶדֶק','כַּדּוּר הָאָרֶץ','כּוֹכָב חַמָּה'],c:0},
      {lines:['דָּנָה חָלְמָה לָטוּס לַחָלָל.','הִיא בָּנְתָה חֲלָלִית מִקַּרְטוֹן.','הִיא לָבְשָׁה חֲלִיפַת חָלָל לְבָנָה.','בַּחֲלוֹם הִיא רִחֲפָה בֵּין הַכּוֹכָבִים.'],
       q:'מִמָּה בָּנְתָה דָּנָה אֶת הַחֲלָלִית?',
       opts:['מִפְּלַסְטִיק','מֵעֵץ','מִקַּרְטוֹן'],c:2},
      {lines:['לַשָּׁבִיט יֵשׁ זָנָב אָרֹךְ שֶׁל אוֹר.','הוּא טָס מַהֵר מְאוֹד בֶּחָלָל.','פַּעַם בְּהַרְבֵּה שָׁנִים הוּא עוֹבֵר לְיַד כַּדּוּר הָאָרֶץ.','מִי שֶׁרוֹאֶה אוֹתוֹ — מְבַקֵּשׁ מִשְׁאָלָה!'],
       q:'מָה יֵשׁ לַשָּׁבִיט?',
       opts:['זָנָב אָרֹךְ שֶׁל אוֹר','כְּנָפַיִם גְּדוֹלוֹת','טַבַּעַת שֶׁל אֶבֶן'],c:0},
      {lines:['תּוֹם הָאַסְטְרוֹנָאוּט טָס לַתַּחֲנָה בֶּחָלָל.','בַּתַּחֲנָה הַכֹּל מְרַחֵף בָּאֲוִיר.','גַּם הַמַּיִם שֶׁלּוֹ רִחֲפוּ כְּמוֹ בּוּעוֹת.','תּוֹם תָּפַס אוֹתָן עִם הַפֶּה!'],
       q:'מָה קוֹרֶה לַדְּבָרִים בַּתַּחֲנָה?',
       opts:['הֵם נוֹפְלִים לָרִצְפָּה','הֵם מְרַחֲפִים בָּאֲוִיר','הֵם נַעֲשִׂים כְּבֵדִים'],c:1},
      {lines:['מַאְדִּים הוּא כּוֹכַב לֶכֶת אָדֹם.','שׁוֹלְחִים אֵלָיו רוֹבּוֹטִים קְטַנִּים.','הָרוֹבּוֹטִים מְצַלְּמִים אֶת הָאֲבָנִים.','אוּלַי יוֹם אֶחָד גַּם אֲנָשִׁים יַגִּיעוּ לְשָׁם.'],
       q:'בְּאֵיזֶה צֶבַע מַאְדִּים?',
       opts:['כָּחֹל','יָרֹק','אָדֹם'],c:2},
      {lines:['בַּלַּיְלָה רָאֲתָה נֹעָה כּוֹכָב נוֹפֵל.','זֶה בִּכְלָל לֹא כּוֹכָב — זוֹ אֶבֶן קְטַנָּה מֵהֶחָלָל.','הָאֶבֶן נִדְלֶקֶת כְּשֶׁהִיא מִתְקָרֶבֶת לָאָרֶץ.','נֹעָה עָצְמָה עֵינַיִם וּבִקְּשָׁה מִשְׁאָלָה.'],
       q:'מָה זֶה בֶּאֱמֶת כּוֹכָב נוֹפֵל?',
       opts:['אֶבֶן קְטַנָּה מֵהֶחָלָל','פָּנָס בַּשָּׁמַיִם','צִפּוֹר זוֹהֶרֶת'],c:0},
      {lines:['לְשַׁבְּתַאי יֵשׁ טַבָּעוֹת יָפוֹת.','הַטַּבָּעוֹת עֲשׂוּיוֹת מִקֶּרַח וַאֲבָנִים.','אֶפְשָׁר לִרְאוֹת אוֹתָן בְּטֶלֶסְקוֹפּ.','זֶה כּוֹכַב הַלֶּכֶת הַיָּפֶה בְּיוֹתֵר!'],
       q:'מִמָּה עֲשׂוּיוֹת הַטַּבָּעוֹת שֶׁל שַׁבְּתַאי?',
       opts:['מִזָּהָב וְכֶסֶף','מִקֶּרַח וַאֲבָנִים','מֵעֲנָנִים'],c:1},
    ],
    unicorns:[
      {lines:['לְחַדַּת הַקֶּרֶן נוֹגָה יֵשׁ רַעְמָה בְּצִבְעֵי הַקֶּשֶׁת.','הִיא גָּרָה בְּעֵמֶק יָרֹק לְיַד מַפָּל.','בַּבֹּקֶר הִיא קוֹפֶצֶת מֵעַל הַפְּרָחִים.','הַקֶּרֶן שֶׁלָּהּ נוֹצֶצֶת בַּשֶּׁמֶשׁ.'],
       q:'אֵיפֹה גָּרָה נוֹגָה?',
       opts:['בַּמִּדְבָּר','בְּעֵמֶק יָרֹק','עַל הָהָר'],c:1},
      {lines:['חַד הַקֶּרֶן סוּפָה עָף מֵעַל הֶעָנָנִים.','יֵשׁ לוֹ כְּנָפַיִם גְּדוֹלוֹת וּלְבָנוֹת.','כְּשֶׁהוּא מִתְעַטֵּשׁ — יוֹרֵד גֶּשֶׁם שֶׁל נִצְנוּצִים!','הַיְּלָדִים לְמַטָּה צוֹחֲקִים וּמוֹחֲאִים כַּפַּיִם.'],
       q:'מָה קוֹרֶה כְּשֶׁסּוּפָה מִתְעַטֵּשׁ?',
       opts:['יוֹרֵד גֶּשֶׁם שֶׁל נִצְנוּצִים','נוֹשֶׁבֶת רוּחַ חֲזָקָה','יוֹצֵאת קֶשֶׁת בֶּעָנָן'],c:0},
      {lines:['קֶרֶן הִיא חַדַּת קֶרֶן קְטַנָּה.','הִיא לָמְדָה לִרְקֹד עִם הַפַּרְפָּרִים.','כָּל עֶרֶב הִיא רוֹקֶדֶת עַל הַדֶּשֶׁא.','הַכּוֹכָבִים מְאִירִים לָהּ כְּמוֹ פָּנָס.'],
       q:'עִם מִי לָמְדָה קֶרֶן לִרְקֹד?',
       opts:['עִם הַצִּפּוֹרִים','עִם הָאַרְנָבִים','עִם הַפַּרְפָּרִים'],c:2},
      {lines:['חַדַּת הַקֶּרֶן פְּנִינָה אוֹהֶבֶת לֶאֱכֹל תּוּתִים.','כָּל בֹּקֶר הִיא קוֹטֶפֶת סַלְסִלָּה מְלֵאָה.','אֶת הַתּוּתִים הַגְּדוֹלִים הִיא שׁוֹמֶרֶת לַחֲבֵרוֹת.','אֵיזוֹ חַדַּת קֶרֶן נְדִיבָה!'],
       q:'מָה אוֹהֶבֶת פְּנִינָה לֶאֱכֹל?',
       opts:['תַּפּוּחִים','בָּנָנוֹת','תּוּתִים'],c:2},
      {lines:['לְחַד הַקֶּרֶן בָּרָק יֵשׁ קֶרֶן כְּסוּפָה.','כְּשֶׁהוּא נוֹגֵעַ בְּפֶרַח נָבוּל — הַפֶּרַח פּוֹרֵחַ מֵחָדָשׁ!','כָּל הַגִּנָּה שֶׁלּוֹ מְלֵאָה פְּרָחִים.','הַדְּבוֹרִים אוֹהֲבוֹת לְבַקֵּר אֶצְלוֹ.'],
       q:'מָה קוֹרֶה כְּשֶׁבָּרָק נוֹגֵעַ בְּפֶרַח נָבוּל?',
       opts:['הַפֶּרַח פּוֹרֵחַ מֵחָדָשׁ','הַפֶּרַח נֶעְלָם','הַפֶּרַח נַעֲשֶׂה כָּחֹל'],c:0},
      {lines:['זוֹהַר הוּא חַד קֶרֶן שֶׁמְּפַחֵד מֵהַחֹשֶׁךְ.','בַּלַּיְלָה הַקֶּרֶן שֶׁלּוֹ מְאִירָה כְּמוֹ פָּנָס.','כָּכָה הוּא כְּבָר לֹא מְפַחֵד.','גַּם הַחֲבֵרִים שֶׁלּוֹ הוֹלְכִים לְיָדוֹ בַּלַּיְלָה.'],
       q:'מִמָּה מְפַחֵד זוֹהַר?',
       opts:['מֵהַגֶּשֶׁם','מֵהַחֹשֶׁךְ','מֵהָרוּחַ'],c:1},
      {lines:['חַדַּת הַקֶּרֶן טַל מְצַיֶּרֶת קְשָׁתוֹת בַּשָּׁמַיִם.','הִיא דּוֹהֶרֶת וְהַזָּנָב שֶׁלָּהּ צוֹבֵעַ אֶת הֶעָנָנִים.','אַחֲרֵי הַגֶּשֶׁם כֻּלָּם מְחַפְּשִׂים אֶת הַקֶּשֶׁת שֶׁלָּהּ.','זֹאת הַקֶּשֶׁת הֲכִי יָפָה בָּעֵמֶק.'],
       q:'מָה מְצַיֶּרֶת טַל בַּשָּׁמַיִם?',
       opts:['עֲנָנִים','כּוֹכָבִים','קְשָׁתוֹת'],c:2},
      {lines:['לִבְנַת חַדַּת הַקֶּרֶן גָּרָה בְּיַעַר הַקְּסָמִים.','יֵשׁ לָהּ חֲבֵרָה סְנָאִית בְּשֵׁם אֱגוֹזָה.','בְּכָל שַׁבָּת הֵן עוֹרְכוֹת פִּיקְנִיק עַל הַדֶּשֶׁא.','אֱגוֹזָה תָּמִיד מְבִיאָה אֱגוֹזִים.'],
       q:'אֵיךְ קוֹרְאִים לַחֲבֵרָה שֶׁל לִבְנַת?',
       opts:['אֱגוֹזָה','שְׁקֵדִיָּה','דֻּבְשָׁנִית'],c:0},
    ],
    dinos:[
      {lines:['הַטִּירָנוֹזָאוּרוּס הָיָה דִּינוֹזָאוּר עֲנָק.','הָיוּ לוֹ שִׁנַּיִם חַדּוֹת וְזָנָב אָרֹךְ.','הוּא רָץ מַהֵר עַל שְׁתֵּי רַגְלַיִם.','הַיָּדַיִם שֶׁלּוֹ הָיוּ קְטַנּוֹת מְאוֹד.'],
       q:'עַל כַּמָּה רַגְלַיִם רָץ הַטִּירָנוֹזָאוּרוּס?',
       opts:['עַל אַרְבַּע','עַל שְׁתַּיִם','עַל שֵׁשׁ'],c:1},
      {lines:['הַבְּרַכְיוֹזָאוּרוּס אָכַל רַק צְמָחִים.','הָיָה לוֹ צַוָּאר אָרֹךְ מְאוֹד.','כָּךְ הוּא הִגִּיעַ לֶעָלִים שֶׁבְּרֹאשׁ הָעֵץ.','הוּא הָיָה גָּבוֹהַּ כְּמוֹ בִּנְיָן!'],
       q:'מָה אָכַל הַבְּרַכְיוֹזָאוּרוּס?',
       opts:['בָּשָׂר','דָּגִים','רַק צְמָחִים'],c:2},
      {lines:['רוֹנִי מָצָא בֵּיצָה גְּדוֹלָה בַּגַּן.','פִּתְאוֹם הַבֵּיצָה נִסְדְּקָה!','יָצָא מִמֶּנָּה דִּינוֹזָאוּר קָטָן וְיָרֹק.','רוֹנִי קָרָא לוֹ צִיקִי.'],
       q:'אֵיךְ קָרָא רוֹנִי לַדִּינוֹזָאוּר?',
       opts:['צִיקִי','רֶקְסִי','דִּינִי'],c:0},
      {lines:['הַפְּטֵרוֹדַקְטִיל הָיָה דִּינוֹזָאוּר מְעוֹפֵף.','הָיוּ לוֹ כְּנָפַיִם גְּדוֹלוֹת מֵעוֹר.','הוּא עָף מֵעַל הַיָּם וְדָג דָּגִים.','הַמַּקּוֹר שֶׁלּוֹ הָיָה אָרֹךְ וְחַד.'],
       q:'מָה אָכַל הַפְּטֵרוֹדַקְטִיל?',
       opts:['עָלִים','דָּגִים','פֵּרוֹת'],c:1},
      {lines:['לַסְּטֵגוֹזָאוּרוּס הָיוּ לוּחוֹת עַל הַגַּב.','הַלּוּחוֹת עָזְרוּ לוֹ לְהִתְחַמֵּם בַּשֶּׁמֶשׁ.','בַּזָּנָב הָיוּ לוֹ קוֹצִים חַדִּים.','כָּכָה הוּא שָׁמַר עַל עַצְמוֹ.'],
       q:'מָה הָיָה לַסְּטֵגוֹזָאוּרוּס עַל הַגַּב?',
       opts:['כְּנָפַיִם','שִׁרְיוֹן קָשֶׁה','לוּחוֹת'],c:2},
      {lines:['לַטְּרִיצֵרָטוֹפְּס הָיוּ שָׁלוֹשׁ קַרְנַיִם.','שְׁתַּיִם גְּדוֹלוֹת מֵעַל הָעֵינַיִם וְאַחַת עַל הָאַף.','הָיָה לוֹ גַּם צַוָּארוֹן עֶצֶם רָחָב.','הוּא אָכַל צְמָחִים נְמוּכִים.'],
       q:'כַּמָּה קַרְנַיִם הָיוּ לַטְּרִיצֵרָטוֹפְּס?',
       opts:['שָׁלוֹשׁ','חָמֵשׁ','שְׁתַּיִם'],c:0},
      {lines:['דָּנָה בִּקְּרָה בְּמוּזֵאוֹן הַדִּינוֹזָאוּרִים.','הִיא רָאֲתָה שֶׁלֶד עֲנָק שֶׁל בְּרַכְיוֹזָאוּרוּס.','הַצַּוָּאר שֶׁלּוֹ הִגִּיעַ עַד הַתִּקְרָה!','דָּנָה צִלְּמָה אוֹתוֹ לְמַזְכֶּרֶת.'],
       q:'אֵיפֹה בִּקְּרָה דָּנָה?',
       opts:['בְּגַן הַחַיּוֹת','בְּמוּזֵאוֹן הַדִּינוֹזָאוּרִים','בַּסִּפְרִיָּה'],c:1},
      {lines:['הַדִּינוֹזָאוּרִים חַיּוּ לִפְנֵי הַרְבֵּה מְאוֹד שָׁנִים.','הֵם נֶעֶלְמוּ מִן הָעוֹלָם.','אֲבָל מָצָאנוּ אֶת הָעֲצָמוֹת שֶׁלָּהֶם בָּאֲדָמָה.','כָּכָה אֲנַחְנוּ לוֹמְדִים עֲלֵיהֶם הַיּוֹם.'],
       q:'אֵיךְ אֲנַחְנוּ לוֹמְדִים עַל הַדִּינוֹזָאוּרִים?',
       opts:['מִסְּרָטִים יְשָׁנִים','מִתְּמוּנוֹת שֶׁצִּלְּמוּ','מֵהָעֲצָמוֹת שֶׁבָּאֲדָמָה'],c:2},
    ],
    princess:[
      {lines:['הַנְּסִיכָה אֲיָלָה גָּרָה בְּאַרְמוֹן וָרֹד.','יֵשׁ לָהּ כֶּתֶר עִם שָׁלוֹשׁ אֲבָנִים כְּחֻלּוֹת.','הִיא מְטַיֶּלֶת בַּגַּן עִם הַטַּוָּס שֶׁלָּהּ.','בָּעֶרֶב הִיא מְנַגֶּנֶת בְּנֵבֶל.'],
       q:'כַּמָּה אֲבָנִים יֵשׁ בַּכֶּתֶר שֶׁל אֲיָלָה?',
       opts:['חָמֵשׁ','שָׁלוֹשׁ','שֶׁבַע'],c:1},
      {lines:['הַנְּסִיכָה תָּמָר אִבְּדָה נַעַל בַּנֶּשֶׁף.','הִיא רָצָה הַבַּיְתָה לִפְנֵי חֲצוֹת.','לְמָחֳרָת הִגִּיעַ שָׁלִיחַ עִם הַנַּעַל.','הַנַּעַל הִתְאִימָה בְּדִיּוּק לְרַגְלָהּ!'],
       q:'מָה אִבְּדָה תָּמָר בַּנֶּשֶׁף?',
       opts:['אֶת הַכֶּתֶר','אֶת הַצָּעִיף','אֶת הַנַּעַל'],c:2},
      {lines:['הַנְּסִיכָה מַיָּה שָׁמְרָה עַל דְּרָקוֹן קָטָן.','הַדְּרָקוֹן יָדַע לְהוֹצִיא בּוּעוֹת סַבּוֹן מֵהָאַף.','כָּל הַמַּמְלָכָה בָּאָה לִרְאוֹת אוֹתוֹ.','מַיָּה קָרְאָה לוֹ בּוּעִינְקָה.'],
       q:'מָה יָדַע הַדְּרָקוֹן לְהוֹצִיא מֵהָאַף?',
       opts:['אֵשׁ יְרֻקָּה','בּוּעוֹת סַבּוֹן','עָשָׁן סָגֹל'],c:1},
      {lines:['הַנְּסִיכָה לִילָךְ אָפְתָה עוּגָה לְיוֹם הַהֻלֶּדֶת שֶׁל הַמֶּלֶךְ.','הִיא שָׂמָה בָּהּ תּוּתִים וְקַצֶּפֶת.','הֶחָתוּל שֶׁל הָאַרְמוֹן נִסָּה לִטְעֹם.','לִילָךְ צָחֲקָה וְנָתְנָה לוֹ בִּיסְקְוִיט.'],
       q:'לְמִי אָפְתָה לִילָךְ עוּגָה?',
       opts:['לַמַּלְכָּה','לַמֶּלֶךְ','לֶחָתוּל'],c:1},
      {lines:['הַנְּסִיכָה יָעֵל לָמְדָה לִרְכֹּב עַל סוּס.','הַסּוּס שֶׁלָּהּ לָבָן וּשְׁמוֹ עָנָן.','בַּהַתְחָלָה הִיא קְצָת פָּחֲדָה.','עַכְשָׁו הֵם דּוֹהֲרִים יַחַד בַּשָּׂדוֹת!'],
       q:'אֵיךְ קוֹרְאִים לַסּוּס שֶׁל יָעֵל?',
       opts:['בָּרָק','שֶׁלֶג','עָנָן'],c:2},
      {lines:['בָּאַרְמוֹן שֶׁל הַנְּסִיכָה שִׁירָה יֵשׁ גַּן וְרָדִים.','כָּל וֶרֶד הוּא בְּצֶבַע אַחֵר.','שִׁירָה מַשְׁקָה אוֹתָם כָּל בֹּקֶר.','הַוֶּרֶד הָאָהוּב עָלֶיהָ הוּא הַסָּגֹל.'],
       q:'אֵיזֶה וֶרֶד אָהוּב עַל שִׁירָה?',
       opts:['הַסָּגֹל','הָאָדֹם','הַצָּהֹב'],c:0},
      {lines:['הַנְּסִיכָה רוֹנִית מָצְאָה מַפְתֵּחַ זָהָב בַּגַּן.','הַמַּפְתֵּחַ פָּתַח דֶּלֶת קְטַנָּה בַּחוֹמָה.','מֵאֲחוֹרֵי הַדֶּלֶת הָיָה גַּן מָלֵא פַּרְפָּרִים.','רוֹנִית בָּאָה לְבַקֵּר אוֹתָם כָּל יוֹם.'],
       q:'מָה מָצְאָה רוֹנִית בַּגַּן?',
       opts:['טַבַּעַת כֶּסֶף','מַפְתֵּחַ זָהָב','צֶדֶף וָרֹד'],c:1},
      {lines:['לַנְּסִיכָה עַלְמָה יֵשׁ כִּנּוֹר קָסוּם.','כְּשֶׁהִיא מְנַגֶּנֶת — הַצִּפּוֹרִים בָּאוֹת לָשִׁיר אִתָּהּ.','גַּם הַסְּנָאִים יוֹרְדִים מֵהָעֵצִים לִרְקֹד.','כָּל הַיַּעַר שָׂמֵחַ כְּשֶׁעַלְמָה מְנַגֶּנֶת.'],
       q:'בְּמָה מְנַגֶּנֶת עַלְמָה?',
       opts:['בַּחֲלִילִית','בְּתֹף','בְּכִנּוֹר'],c:2},
    ],
  };

  // one CARD from a library entry: shuffle the options (the correct slot varies
  // per card) and store `a` as the 1-BASED index of the correct option.
  function makeOne(topic,entry){
    const order=sh(entry.opts.map((_,i)=>i));
    const opts=order.map(i=>entry.opts[i]);
    return {t:TSQ,topic,emoji:TOPICS[topic].emoji,lines:entry.lines.slice(),
            q:entry.q,opts,a:order.indexOf(entry.c)+1};
  }
  // sup/mulc: ONE story per game — the reading slots (one per 5 exercises) are
  // now SHARED between the reading kinds (story/cloze/true-false/match/order),
  // so each game gets one story card. NO-REPEAT ROTATION (user: the child must
  // not memorise answers): TOPICS rotate via their own shuffled queue, and each
  // topic serves its stories from a shuffled queue too — a story cannot reappear
  // until ALL of its topic's stories were shown; an emptied queue reshuffles,
  // never starting with the entry that just closed the previous cycle.
  // 'story' (tester handle): the whole library.
  const _queues={};
  function _nextIdx(key,len){
    let q=_queues[key];
    if(!q||!q.length){
      q=sh(Array.from({length:len},(_,i)=>i));
      // don't let the fresh cycle open with the entry that just closed the last one
      if(_queues[key+'_last']===q[0]&&q.length>1)q.push(q.shift());
      _queues[key]=q;
    }
    const i=q.shift();
    _queues[key+'_last']=i;
    return i;
  }
  function makePool(mode){
    const keys=Object.keys(LIB);
    if(mode==='story'){
      const all=[];keys.forEach(k=>LIB[k].forEach(e=>all.push(makeOne(k,e))));
      return sh(all);
    }
    const topic=keys[_nextIdx('_topics',keys.length)];
    return [makeOne(topic,LIB[topic][_nextIdx(topic,LIB[topic].length)])];
  }

  const CSS=`
  .sq-root{position:relative;display:flex;flex-direction:column;align-items:center;gap:14px;width:100%;max-width:560px;margin:0 auto}
  .sq-story{direction:rtl;text-align:center;line-height:1.8;width:100%;
    font-family:'Fredoka One','Heebo',sans-serif;font-weight:400;
    font-size:1.35rem;color:var(--skin-text,#fff);
    text-shadow:0 0 12px rgba(160,190,255,.25);
    background:rgba(255,255,255,.08);border:2px solid rgba(255,255,255,.18);
    border-radius:16px;padding:14px 18px;animation:sqFade .35s ease}
  .sq-emoji{font-size:1.9rem;line-height:1;display:block;margin-bottom:6px;filter:drop-shadow(0 3px 6px rgba(0,0,0,.3))}
  @keyframes sqFade{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}
  .sq-q{direction:rtl;text-align:center;font-family:'Fredoka One','Heebo',sans-serif;
    font-size:1.3rem;color:var(--skin-accent,#ffd27d);line-height:1.5;padding:0 6px;
    text-shadow:0 0 10px rgba(255,210,125,.35)}
  /* the answers — vowelled pills; tap to SELECT (highlight), ✓ submits */
  .sq-opts{display:flex;flex-direction:column;align-items:stretch;gap:9px;width:100%;max-width:430px;direction:rtl}
  .sq-opt{font-family:'Fredoka One','Heebo',sans-serif;font-size:1.25rem;color:var(--skin-text,#fff);
    direction:rtl;text-align:right;line-height:1.5;cursor:pointer;user-select:none;
    background:rgba(255,255,255,.07);border:2px solid rgba(255,255,255,.25);border-radius:14px;
    padding:9px 14px;display:flex;align-items:center;gap:10px;
    transition:transform .12s,border-color .15s,background .15s,box-shadow .15s}
  .sq-opt:hover{background:rgba(255,255,255,.13)}
  .sq-opt .sq-dot{flex-shrink:0;width:22px;height:22px;border-radius:50%;
    border:2px solid rgba(255,255,255,.5);transition:background .15s,border-color .15s;
    display:flex;align-items:center;justify-content:center}
  .sq-opt.sq-sel{border-color:var(--skin-primary,#c77dff);background:rgba(199,125,255,.18);
    box-shadow:0 0 14px rgba(199,125,255,.35);transform:translateY(-1px)}
  .sq-opt.sq-sel .sq-dot{background:var(--skin-primary,#c77dff);border-color:var(--skin-primary,#c77dff)}
  .sq-opt.sq-ok{border-color:#4caf50;background:rgba(76,175,80,.2);box-shadow:0 0 14px rgba(76,175,80,.45)}
  .sq-opt.sq-ok .sq-dot{background:#4caf50;border-color:#4caf50}
  .sq-opt.sq-err{border-color:#e91e63;background:rgba(233,30,99,.16);animation:sqShake .4s ease}
  @keyframes sqShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}60%{transform:translateX(5px)}}
  .sq-opt.sq-off{opacity:.6;cursor:default}
  /* the ✓ SUBMIT — the "הגשה" button (user spec: pick, then press V) */
  .sq-chk{font-family:'Fredoka One',cursive;font-size:1.35rem;border:0;border-radius:14px;padding:11px 34px;
    cursor:pointer;color:#fff;background:linear-gradient(160deg,#86E29B,#2FA257 85%);
    border:2px solid rgba(255,255,255,.5);box-shadow:0 3px 0 rgba(0,0,0,.28)}
  .sq-chk:active{transform:translateY(2px);box-shadow:0 1px 0 rgba(0,0,0,.28)}
  .sq-chk:disabled{opacity:.4;cursor:default;box-shadow:none}
  @media(max-width:480px){
    .sq-story{font-size:1.15rem;padding:12px 12px}
    .sq-q{font-size:1.15rem}
    .sq-opt{font-size:1.1rem;padding:8px 11px}
  }`;
  function injectStyle(){
    if(document.getElementById('sq-style'))return;
    const st=document.createElement('style');st.id='sq-style';st.textContent=CSS;
    document.head.appendChild(st);
  }

  let _uid=0;
  function mount(ctx){
    injectStyle();
    const {root,api}=ctx;
    const p=ctx.p||{};
    const lines=p.lines||[];
    const q=p.q||'';
    const opts=p.opts||[];
    const correct=(typeof p.a==='number'&&p.a)||(typeof ctx.a==='number'&&ctx.a)||1;   // 1-based
    const emoji=p.emoji||'📖';
    const uid=++_uid;
    let done=false, picked=0;                       // picked: 1-based, 0 = nothing
    const timers=[];const later=(fn,ms)=>{timers.push(setTimeout(fn,ms));};
    const hint=msg=>{const h=document.getElementById('hint');if(h)h.textContent=msg;};

    root.innerHTML=
      '<div class="sq-root" id="sq-root-'+uid+'">'+
        '<div class="sq-story"><span class="sq-emoji">'+emoji+'</span>'+lines.join('<br>')+'</div>'+
        '<div class="sq-q">'+q+'</div>'+
        '<div class="sq-opts" role="listbox" aria-label="תְּשׁוּבוֹת">'+
          opts.map((o,i)=>'<div class="sq-opt" role="option" data-i="'+(i+1)+'" tabindex="0">'+
            '<span class="sq-dot"></span><span>'+o+'</span></div>').join('')+
        '</div>'+
        '<button class="sq-chk" id="sq-chk-'+uid+'" aria-label="הַגָּשָׁה">✓</button>'+
      '</div>';

    const optEls=Array.prototype.slice.call(root.querySelectorAll('.sq-opt'));
    const chk=root.querySelector('#sq-chk-'+uid);
    hint('📖 קִרְאִי אֶת הַסִּפּוּר, בַּחֲרִי תְּשׁוּבָה וְלַחֲצִי ✓ לְהַגִּישׁ!');

    function select(i){                             // i: 1-based
      if(done)return;
      picked=i;
      optEls.forEach(el=>{el.classList.remove('sq-sel','sq-err');});
      optEls[i-1].classList.add('sq-sel');
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
      if(picked===correct){
        done=true;
        el.classList.remove('sq-sel');el.classList.add('sq-ok');
        optEls.forEach(o=>{if(o!==el)o.classList.add('sq-off');});
        chk.disabled=true;
        hint('🎉 נָכוֹן! קָרָאת מְצֻיָּן!');
        api.solved();
      }else{
        el.classList.remove('sq-sel');el.classList.add('sq-err');
        api.wrong(picked);                          // penalty + sad modal (the picked option #)
        hint('לֹא בְּדִיּוּק — קִרְאִי שׁוּב אֶת הַסִּפּוּר וְנַסִּי שׁוּב 💗');
        const wrongEl=el;
        later(()=>{if(!done){wrongEl.classList.remove('sq-err');if(picked===+wrongEl.getAttribute('data-i'))picked=0;}},1100);
      }
    }
    chk.addEventListener('click',submit);
    const onKey=e=>{if(e.key==='Enter'&&!done&&picked){e.preventDefault();submit();}};
    root.addEventListener('keydown',onKey);

    return function cleanup(){timers.forEach(clearTimeout);root.innerHTML='';};
  }

  return{
    t:TSQ,
    modes:['story','sup','mulc'],   // 'story' = internal tester handle
    aidsReveal:'always',            // a reading exercise — no arithmetic aid to lock
    make(mode){return mode==='story'?makePool('story'):(mode==='sup'||mode==='mulc')?makePool(mode):[];},
    _resetRotation(){for(const k in _queues)delete _queues[k];},   // test hook (queue phase)
    mount,
  };
})();
