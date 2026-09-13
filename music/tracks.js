/* Soundtrack + credits.
 *
 * Every slot must point at a file that exists or it plays silence - run
 * python3 tools/check_music.py to verify.
 *
 *   'gd:Name.mp3'  -> assets-local/music/   (Geometry Dash soundtrack)
 *   'Name.mp3'     -> music/                (this folder)
 */
window.CUSTOM_MUSIC = {
  menu:    { file:'chopin-nocturne.mp3',          title:'Nocturne Op. 9 No. 2',   by:'Frederic Chopin (public domain work)' },
  // ---- DROP-IN SLOTS -------------------------------------------------------
  // Download the song yourself, save it in music/ with EXACTLY this filename,
  // and it plays automatically. Until then the fallback track plays instead.
  // Nothing here needs editing.
  lvl1:    { file:'fatrat.mp3',       title:'TheFatRat track',  by:'TheFatRat',
             fallback:'gd:BackOnTrack.mp3', fallbackTitle:'Back On Track', fallbackBy:'DJVI' },
  lvl2:    { file:'nine-circles.mp3', title:'Nine Circles',     by:'(Newgrounds artist)',
             fallback:'gd:Polargeist.mp3',  fallbackTitle:'Polargeist',    fallbackBy:'Step' },
  lvl3:    { file:'bloodbath.mp3',    title:'At the Speed of Light', by:'Dimrain47',
             fallback:'gd:CantLetGo.mp3',   fallbackTitle:"Can't Let Go",  fallbackBy:'DJVI' },
  // --------------------------------------------------------------------------
  lvl4:    { file:'gd:Jumper.mp3',                title:'Jumper',                 by:'Waterflame' },
  lvl5:    { file:'gd:TimeMachine.mp3',           title:'Time Machine',           by:'Waterflame' },
  lvl6:    { file:'gd:Clutterfunk.mp3',           title:'Clutterfunk',            by:'Waterflame' },
  lvl7:    { file:'gd:Electrodynamix.mp3',        title:'Electrodynamix',         by:'DJ-Nate' },
  lvl8:    { file:'gd:Clubstep.mp3',              title:'Clubstep',               by:'DJ-Nate' },
  lvl9:    { file:'gd:TheoryOfEverything2.mp3',   title:'Theory of Everything 2', by:'DJ-Nate' },
  lvl10:   { file:'shiawase-vip.mp3',             title:'Shiawase (Vip)',         by:'supplied by the player' },
  daily:   { file:'gd:HexagonForce.mp3',          title:'Hexagon Force',          by:'Waterflame' },
  // Endless rotates its look and track every attempt
  endless1:{ file:'gd:Fingerdash.mp3',            title:'Fingerdash',             by:'MDK' },
  endless2:{ file:'gd:Clutterfunk.mp3',           title:'Clutterfunk',            by:'Waterflame' },
  endless3:{ file:'gd:Deadlocked.mp3',            title:'Deadlocked',             by:'F-777' },
  endless4:{ file:'gd:Electrodynamix.mp3',        title:'Electrodynamix',         by:'DJ-Nate' },
  endless5:{ file:'gd:TheoryOfEverything2.mp3',   title:'Theory of Everything 2', by:'DJ-Nate' },
  endless6:{ file:'gd:Clubstep.mp3',              title:'Clubstep',               by:'DJ-Nate' },
  endless7:{ file:'gd:BlastProcessing.mp3',       title:'Blast Processing',       by:'Waterflame' },
  endless8:{ file:'gd:GeometricalDominator.mp3',  title:'Geometrical Dominator',  by:'Waterflame' },
  endless: { file:'gd:Fingerdash.mp3',            title:'Fingerdash',             by:'MDK' },
};

/* Spare GD tracks already copied, if you want to swap any slot:
 *   gd:Deadlocked.mp3  (F-777)   gd:BlastProcessing.mp3 (Waterflame)
 *   gd:GeometricalDominator.mp3 (Waterflame)   gd:StereoMadness.mp3 (ForeverBound)
 *
 * Nine Circles and Bloodbath are community levels - their songs come from
 * Newgrounds and are NOT in the Geometry Dash install, so they cannot be
 * pulled from your copy of the game. Download one yourself where the licence
 * allows, drop it in music/, and point a slot at it.
 */
window.EXTRA_CREDITS = [
  { what:'Sprites',      who:'Geometry Dash - RobTop Games' },
  { what:'Sound effects',who:'Geometry Dash - RobTop Games' },
  { what:'Swingcopter',  who:'Geometry Dash - RobTop Games' },
  { what:'Code & levels',who:'this project' },
  { what:'Note',         who:'Personal build. Art and music belong to their creators.' },
];
