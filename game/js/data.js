/* ── roundRect polyfill ── */
if(!CanvasRenderingContext2D.prototype.roundRect){
  CanvasRenderingContext2D.prototype.roundRect=function(x,y,w,h,r){
    this.beginPath();this.moveTo(x+r,y);this.lineTo(x+w-r,y);
    this.quadraticCurveTo(x+w,y,x+w,y+r);this.lineTo(x+w,y+h-r);
    this.quadraticCurveTo(x+w,y+h,x+w-r,y+h);this.lineTo(x+r,y+h);
    this.quadraticCurveTo(x,y+h,x,y+r);this.lineTo(x,y+r);
    this.quadraticCurveTo(x,y,x+r,y);this.closePath();
  };
}

/* ── Data ── */
const TM='missing',TS='sub',TA='add',TX='mixed',TZ='triple',TW='twin_sub',TDA='dbl_add',TDS='dbl_sub',TC='coins',TT='tens',TCA='col_add',TCS='col_sub',TBG='big_step',TCM='coin_mul',TBC='bagel_cost';
const gameLen=()=>problems.length;

/* ── Exercise-type modules — ONE FILE PER TYPE (exercises/<file>.ex.js) ─────
   Every exercise type lives in its own file and registers itself into
   window.EXERCISES.types. When a game mode starts, bg-loader.loadExercisesFor
   injects exactly the files whose `modes` list includes that mode, and the
   pool recipes (problems.js) build the session from the registered types.
   (architecture.md §3.6) */
const EXERCISE_INDEX=[
  {file:'add',       modes:[0,5,10,20,'br','mx']},
  {file:'sub',       modes:[5,10,20,'br','mx']},
  {file:'missing',   modes:[5,10,20,'mx']},
  {file:'double',    modes:[5,10,20,'mx']},
  {file:'coins',     modes:[5,10,20,'mx','sup']},
  {file:'chain',     modes:['mx']},
  {file:'tens',      modes:['mx']},
  {file:'column_add',modes:['sup']},
  {file:'column_sub',modes:['mx','sup']},
  {file:'coin_mul',  modes:['sup']},
  {file:'bagel_cost',modes:['sup']},
  {file:'big_step',  modes:['big','mx','sup']},
];
/* exercise types that bring their own interactive UI (mount/cleanup) */
const EXERCISE_OF_TYPE={[TCA]:'column_add',[TCS]:'column_sub',[TCM]:'coin_mul',[TBC]:'bagel_cost'};

/* ── Difficulty configuration ───────────────────────────────────────────────
   The mode picker in the settings modal is RENDERED from this config
   (core.js → renderModePicker). Moving / adding / renaming games never
   touches logic. */
const DIFFICULTY_GROUPS=[
  {id:'easy',label:'קַל',modes:[
    {id:0,   label:'1+1 🌱'},
    {id:5,   label:'עַד 5'},
    {id:10,  label:'עַד 10'},
    {id:20,  label:'עַד 20'},
  ]},
  {id:'medium',label:'בֵּינוֹנִי',modes:[
    {id:'br',label:'גָּשֵׁר 10 🌈'},
    {id:'mx',label:'מַלְכָּה 👸'},
    {id:'sup',label:'סוּפֶּרְמֶן 🦸'},
  ]},
];
/* NOTE: the 🎁 prize badge is NOT part of the label — it is appended at render
   time (renderModePicker) only for games that currently have a prize set, and
   the level is editable per game in settings (GIFT_GOALS / setGiftGoal). */
/* NOTE: the standalone "עַד 100 💯" game (mode 'big', TBG big-number ±1/2) was
   removed from the picker; those exercises now live INSIDE Queen (mx) and
   Superman (sup) — see big_step.ex.js make('mx'/'sup') and problems.js. The
   'big' mode logic is kept as an internal handle (tests + the shared TBG type). */

/* ── Success-screen files (success_screens/<name>.js) ───────────────────────
   Listed files are injected dynamically at boot by bg-loader.js and register
   themselves into window.SUCCESS.styles — the per-answer celebration ROTATION
   (see success_screens_spec.md). */
const SUCCESS_FILES=[
  'success-supernova',
  'success-comet-shower',
  'success-constellation-heart',
  'success-electric-orb',
  'success-lightning-storm',
  'success-blooming-garden',
  'success-unicorn-rainbow',
  'success-black-hole-stars',
  'success-star-race',
  'success-aurora-glow',
  'success-bubble-pop',
  'success-magic-wand',
  'success-rocket-launch',
  'success-princess-crown',
  'success-butterfly-swarm',
  'success-snow-sparkle',
  'success-dolphin-splash',
  'success-fireworks-show',
  'success-confetti-cannon',
  'success-shooting-stars',
  'success-balloon-float',
  'success-trophy-shine',
  'success-paint-splash',
  'success-music-notes',
  'success-pinwheel-spin',
  'success-firefly-dance',
  'success-ribbon-streamers',
  'success-phoenix-rising',
  'success-peacock-fan',
  'success-kaleidoscope-bloom',
  'success-birthday-cake',
  'success-carousel-spin',
  'success-sky-lanterns',
  'success-treasure-chest',
  'success-prism-rainbow',
  'success-enchanted-tree',
];

/* ── Special reward screens (success_screens/<sub>/<name>.js) ────────────────
   NOT part of the per-answer rotation. They register into window.SUCCESS.special
   and the host plays them on a specific milestone — e.g. the gift screen runs
   only at end-of-set when the grade clears the gift threshold (GIFT_GOALS,
   core.js → endGame → showGiftScreen). Each lives in its own subfolder. */
const SUCCESS_SPECIAL=[
  'gift/success-gift-surprise',
];
