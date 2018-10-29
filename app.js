import z from './lib/zombular/body';
import Typed from './lib/typed/typed';
import smoothScroll from './lib/smoothscroll';

document.title = 'Blackmius';

const breakpoints = {
	xlarge: '(max-width: 1800px)',
	large: '(max-width: 1280px)',
	medium: '(max-width: 980px)',
	notSmall: '(min-width: 769px)',
	small: '(max-width: 769px)',
	xsmall: '(max-width: 480px)'
}

const breakpoint = (a, b) => `@media screen and ${breakpoints[a]} {${b}}`;

const Style = z._style(`
@import url('https://fonts.googleapis.com/css?family=PT+Sans|PT+Serif:400,700');
@import url("/assets/icomoon/style.css");
@import url("/lib/normalize.css");

* { box-sizing: border-box; }
html { font: 400 10px/15px 'PT Sans', sans-serif; }

.l1 { font-size: 10px; line-height: 15px; top:  3px; position: relative; }
.l2 { font-size: 12px; line-height: 15px; top:  2px; position: relative; }
.l3 { font-size: 20px; line-height: 30px; top:  8px; position: relative; }
.l4 { font-size: 24px; line-height: 30px; top:  7px; position: relative; }
.l5 { font-size: 30px; line-height: 45px; top: 12px; position: relative; }
.l6 { font-size: 40px; line-height: 45px; top:  9px; position: relative; }
.l7 { font-size: 50px; line-height: 60px; top: 15px; position: relative; }
.l8 { font-size: 58px; line-height: 60px; top: 10px; position: relative; }
.l9 { font-size: 74px; line-height: 75px; top: 18px; position: relative; }

.f1 { font-family: 'PT Serif', sans-serif; } .w7 { font-weight: 700; }
.c0 { color: #000; }
.b0 { background-color: #fefefe; } .b1 { background-color: #f5f5f5; }
.fvh { height: 100vh; }

.g { display: flex; }
.g.c { flex-direction: column; }
.g.jcc { justify-content: center; }

.di { display: inline-block; }

.p0 { padding: 0 45px; }
.p1 { padding: 0 90px; }

.sp1 { margin-top: 15px; }
.sp2 { margin-top: 30px; }
.sp3 { margin-top: 45px; }
.sp4 { margin-top: 60px; }
.sp5 { margin-top: 75px; }
.sp6 { margin-top: 90px; }

.pr { position: relative; }
.pa { position: absolute; }
.pb0 { bottom: 30px; }
.pc { left: 0; right: 0; }

.tc { text-align: center; }
.cp { cursor: pointer; }

.floating { animation-name: floating; animation-duration: 3s;
    animation-iteration-count: infinite; animation-timing-function: ease-in-out;
}

@keyframes floating {
    from { transform: translate(0,  0px); }
    65%  { transform: translate(0, 15px); }
    to   { transform: translate(0, -0px); }
}

a { color: inherit; text-decoration: none; display: inline-block; }
a::after { content: ''; display: block; width: 0; height: 2px; background: #000;transition: width .3s; }
a:hover::after { width: 100%; }

.column { display: block; flex-basis: 0; flex-grow: 1;
	flex-shrink: 1; padding: 0.75rem; }
.columns { margin: -0.75rem -0.75rem 0.75rem -0.75rem; }
.preview { width: 100%; border-radius: 2px; }

${breakpoint('medium', `
	.p1 { padding: 0 45px; }
    .l9 { font-size: 50px; line-height: 60px; top: 15px; position: relative; }
`)}

${breakpoint('notSmall', `
	.columns { display: flex; }
`)}

`);

const Icon = name => z(`i.icon-${name}`);

const AboutMe = `I'm a full-stack web developer with 5 years of professional experience.
The scope of my work is a large part of the front end: HTML/CSS/JS,
building Single Page Apps with Zombular, designing web application using modern
approaches. Also I get my hands dirty with some back end applications written in Python and NodeJS.`;

const ContactMe = `I am available for remote opprotunity, collaborations and interesting projects.
If you would like to build something together, contact me.`;

const Contacts = [
    ['8 (918) 201 19 31', 'tel:89182011931'],
    ['blackmius@gmail.com', 'mailto:blackmius@gmail.com'],
    ['t.me/blackmius', 'https://t.me/blackmius'],
    ['bitbucket.org/blakmius', 'https://bitbucket.org/blakmius'],
    ['github.com/blackmius', 'https://github.com/blackmius']
]

const Project = ({name, description, image, links}) => z('.sp2.column',
	z('<', `<img class="preview" src="${image}">`),
	z.f1.w7.l5(name),
	z.l3(description),
    z.sp1.l3(z.each(links, ([text, href]) => z._a({href}, text), z.sp05()))
);

let projects = [], columns = 2;
fetch('/assets/projects/data.json')
    .then(res => res.json())
    .then(data => {
        while (data.length > 0) projects.push(z.columns.sp1(
        	data.splice(0, columns).map(Project)
        ));
        z.update();
    });

const Body = z.c0(Style,
    z.pr.fvh.g.c.jcc.p0.b0(
        z.l9.w7.f1(z({is: 'span#TypedSentence'})),
        z.pa.pb0.pc(z.tc.l6(z.cp.di.floating({onclick: e => smoothScroll('AboutMe', 500)}, Icon('chevron-down'))))
    ),
    z.p1.b1.di({is: '#AboutMe'},
        z.l6.w7.f1.sp6('About me'),
        z.l3.sp2(AboutMe),
        z.l6.w7.f1.sp4('Get in touch'),
        z.l3.sp2(ContactMe),
        z.sp4.l4.w7(
            z.each(Contacts, ([text, href]) => z._a({href}, text), z._br())
        ),
        z.sp6(),
    ),
    z.p1.b0(
        z.sp6.di(),
        z.l7.w7.f1.tc('My recent projects'),
        _ => z.sp4(projects),
        z.sp6.di(),
    )
);
z.setBody(Body);

const typed = new Typed('#TypedSentence', {
  strings: ['Hello, I am Daniil, a FullStack web developer'],
  showCursor: true,
  cursorChar: '_',
  typeSpeed: 45
});
