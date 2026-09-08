// A one-time overview shown before the first placement question — explains
// the mechanics (green = you'll place it, red = Cirrus derives it, click
// "Place <next category>" to move on) once, up front, instead of making the
// user infer the flow from the first question box alone.
export function GuidedFlowIntro({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="ls-placement-backdrop">
      <div className="ls-placement-question ls-placement-intro">
        <div className="ls-placement-question-header">Building this room</div>
        <p className="ls-placement-question-text">
          Cirrus will ask you four quick questions — infrastructure, fixtures, stations &amp; equipment, and zone requirements.
          For each one, mark what you already know the placement of. Anything you leave unmarked is derived: Cirrus calculates and generates those placements for you automatically, so you never have to place everything by hand.
        </p>
        <p className="ls-placement-question-text">
          Once you're done placing what you marked for yourself, click the <b>Place next category</b> button to move on to the next question.
        </p>
        <div className="ls-placement-question-actions">
          <button type="button" className="ls-qb-manual active" onClick={onDismiss}>Got it, let's start →</button>
        </div>
      </div>
    </div>
  );
}
