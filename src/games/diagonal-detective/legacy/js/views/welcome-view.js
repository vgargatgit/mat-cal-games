import { masteryPercentage } from '../engine/mastery.js';

export function createWelcomeView({ game, onStart, onContinue, onTutorial }) {
  const page=document.createElement('div');page.className='page';
  const mastery=masteryPercentage(game.mastery);
  page.innerHTML=`
    <section class="hero">
      <div class="hero-copy stack">
        <span class="kicker">Matrix Calculus Game 04</span>
        <h1>Diagonal <span>Detective</span></h1>
        <p class="lead">Before calculating a Jacobian, investigate who depends on whom. Missing paths reveal structural zeros. One-to-one matching paths reveal diagonal structure.</p>
        <div class="row">
          <button class="btn accent" data-action="start">Start investigation</button>
          <button class="btn secondary" data-action="continue">Continue level ${game.progress.currentLevel}</button>
          <button class="btn secondary" data-action="tutorial">Eight-step tutorial</button>
        </div>
        <div class="card stack">
          <div class="spread"><strong>Agency mastery</strong><strong>${mastery}%</strong></div>
          <div class="progress-track" aria-label="${mastery}% mastery"><div class="progress-fill" style="width:${mastery}%"></div></div>
          <div class="three-column">
            <div class="metric"><small>Cases solved</small><strong>${game.progress.completedCases.length}</strong></div>
            <div class="metric"><small>Best streak</small><strong>${game.progress.bestStreak}</strong></div>
            <div class="metric"><small>Evidence score</small><strong>${game.progress.score}</strong></div>
          </div>
        </div>
      </div>
      <div class="card hero-board" aria-label="Detective evidence board illustration">
        <div class="case-note"><strong>Central rule</strong><br>No dependency path means a structurally zero Jacobian cell.</div>
        <div class="string" style="width:55%;transform:translate(25px,35px) rotate(18deg)"></div>
        <div class="case-note"><strong>Do not confuse</strong><br>Structural 0: no path.<br>Evaluated 0*: path exists, local slope vanishes.</div>
        <div class="string" style="width:65%;transform:translate(80px,10px) rotate(-12deg)"></div>
        <div class="case-note"><strong>Case warning</strong><br>Square ≠ diagonal.<br>Diagonal ≠ identity.</div>
      </div>
    </section>`;
  page.querySelector('[data-action="start"]').addEventListener('click',()=>onStart(1));
  page.querySelector('[data-action="continue"]').addEventListener('click',onContinue);
  page.querySelector('[data-action="tutorial"]').addEventListener('click',onTutorial);
  return page;
}
