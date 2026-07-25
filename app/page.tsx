// This is the homepage. It's just a stack of placeholder sections for
// now - no animation or real content yet, just the layout skeleton.
// Each <section> below is styled in src/styles/base.css to be at
// least one full screen tall (min-height: 100vh).
export default function Home() {
  return (
    <>
      {/* ---- 1. HERO -------------------------------------------------
          The very first thing a visitor sees when the page loads. */}
      <section id="hero">
        <h2>Hero</h2>
        <p>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
          eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut
          enim ad minim veniam, quis nostrud exercitation ullamco laboris
          nisi ut aliquip ex ea commodo consequat.
        </p>
      </section>

      {/* ---- 2. ABOUT -------------------------------------------------
          A short introduction / bio section. */}
      <section id="about">
        <h2>About</h2>
        <p>
          Duis aute irure dolor in reprehenderit in voluptate velit esse
          cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat
          cupidatat non proident, sunt in culpa qui officia deserunt
          mollit anim id est laborum.
        </p>
      </section>

      {/* ---- 3. EXPERIENCE ---------------------------------------------
          Work history / career timeline goes here later. */}
      <section id="experience">
        <h2>Experience</h2>
        <p>
          Sed ut perspiciatis unde omnis iste natus error sit voluptatem
          accusantium doloremque laudantium, totam rem aperiam, eaque
          ipsa quae ab illo inventore veritatis et quasi architecto
          beatae vitae dicta sunt explicabo.
        </p>
      </section>

      {/* ---- 4. CASE STUDIES --------------------------------------------
          Featured projects / portfolio pieces go here later. */}
      <section id="case-studies">
        <h2>Case Studies</h2>
        <p>
          Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut
          odit aut fugit, sed quia consequuntur magni dolores eos qui
          ratione voluptatem sequi nesciunt.
        </p>
      </section>

      {/* ---- 5. CERTIFICATES --------------------------------------------
          Certifications / qualifications go here later. */}
      <section id="certificates">
        <h2>Certificates</h2>
        <p>
          Neque porro quisquam est, qui dolorem ipsum quia dolor sit
          amet, consectetur, adipisci velit, sed quia non numquam
          eiusmodi tempora incidunt ut labore et dolore magnam aliquam
          quaerat voluptatem.
        </p>
      </section>

      {/* ---- 6. SKILLS -------------------------------------------------
          A list/grid of skills goes here later. */}
      <section id="skills">
        <h2>Skills</h2>
        <p>
          Ut enim ad minima veniam, quis nostrum exercitationem ullam
          corporis suscipit laboriosam, nisi ut aliquid ex ea commodi
          consequatur.
        </p>
      </section>

      {/* ---- 7. CONTACT ------------------------------------------------
          A contact form or contact details go here later. */}
      <section id="contact">
        <h2>Contact</h2>
        <p>
          Quis autem vel eum iure reprehenderit qui in ea voluptate
          velit esse quam nihil molestiae consequatur, vel illum qui
          dolorem eum fugiat quo voluptas nulla pariatur.
        </p>
      </section>
    </>
  );
}
