/* Soundtrack + credits.
 *
 * pub:true  -> the artist cleared this track for redistribution, so it ships
 *              with the public site (from music/web/, a smaller 128k copy).
 *              Everything without it stays on this machine only.
 *
 * Every slot must point at a file that exists or it plays silence - run
 * python3 tools/check_music.py to verify.
 *
 *   'gd:Name.mp3'  -> assets-local/music/   (Geometry Dash soundtrack)
 *   'Name.mp3'     -> music/                (this folder)
 */
window.CUSTOM_MUSIC = {
  menu:    { file:'chopin-nocturne.mp3',          title:'Nocturne Op. 9 No. 2',   by:'Frederic Chopin (public domain work)' },
  lvl1:    { file:'gd:BackOnTrack.mp3',           title:'Back On Track',          by:'DJVI' },
  lvl2:    { file:'gd:Polargeist.mp3',            title:'Polargeist',             by:'Step' },
  lvl3:    { file:'the-disturbance.mp3',          title:'The Disturbance',        by:'Newgrounds artist', ng:898361, pub:true },
  lvl4:    { file:'spaceship.mp3',                title:'SpaceShip GD',           by:'Newgrounds artist', ng:727419, pub:true },
  lvl5:    { file:'axel-f-remix.mp3',             title:'Axel F Remix',           by:'Newgrounds remixer; "Axel F" written by Harold Faltermeyer', ng:798782, pub:true },
  lvl6:    { file:'gd:Clutterfunk.mp3',           title:'Clutterfunk',            by:'Waterflame' },
  lvl7:    { file:'gd:Electrodynamix.mp3',        title:'Electrodynamix',         by:'DJ-Nate' },
  lvl8:    { file:'gd:Clubstep.mp3',              title:'Clubstep',               by:'DJ-Nate' },
  lvl9:    { file:'at-the-speed-of-light.mp3',     title:'At the Speed of Light',  by:'Dimrain47' },
  lvl10:   { file:'shiawase-vip.mp3',             title:'Shiawase (Vip)',         by:'Diane Timmer', pub:true },
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
 *
 * Every slot points at a file that exists. Nothing falls back, so the name on
 * the level card is always the track that is actually playing.
 */
window.EXTRA_CREDITS = [
  { what:'Sprites',      who:'Geometry Dash - RobTop Games' },
  { what:'Sound effects',who:'Geometry Dash - RobTop Games' },
  { what:'Swingcopter',  who:'Geometry Dash - RobTop Games' },
  { what:'Code & levels',who:'this project' },
  { what:'Note',         who:'Personal build. Art and music belong to their creators.' },
  { what:'Music online',  who:'Only tracks whose artists allow reuse are on the public site. The rest play locally.' },
];
