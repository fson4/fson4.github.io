"use strict"
let tasks = ["0-9", "ABC", "color"],
	time = { state: 2500, stimulus: 1000 },
	dual = 1,
	sound = 1,
	reverse = 1,
	range = { min: 4, max: 7, x: 2, auto: 1 },
	board, opt, stimulus, panel, stimuli, input, count, limit, rounds, seq, delay, wl, lang

const audio = new AudioContext(),
	layout = new DocumentFragment(),
	$ = sel => board.querySelector(sel),
	create = (tag, parentNode, className) => {
		const el = document.createElement(tag)
		if (parentNode) parentNode.append(el)
		if (className) el.className = className
		return el
	},
	ocillator = (type, freq) => {
		const osc = audio.createOscillator()
		osc.type = type
		osc.frequency.setValueAtTime(freq, audio.currentTime)
		return osc
	},
	gain = rampEnd => {
		const amp = audio.createGain()
		amp.gain.value = .2
		if (rampEnd) amp.gain.exponentialRampToValueAtTime(.0001, audio.currentTime + rampEnd)
		return amp
	},
	ocillate = (osc, amp, stop) => {
		if (!sound) return
		osc.connect(amp).connect(audio.destination)
		osc.start()
		osc.stop(audio.currentTime + stop)
	},
	playPress = () => {
		const amp = gain(.1)
		amp.gain.exponentialRampToValueAtTime(amp.gain.value, audio.currentTime + .01)
		ocillate(ocillator("sine", 540), amp, .1)
	},
	playBuzzer = () => {
		ocillate(ocillator("sawtooth", 140), gain(), .6)
	},
	playSuccess = () => {
		let i = 0, x
		const aud = () => {
				const osc = ocillator("sine", 1400),
					amp = gain(.2)
				amp.gain.exponentialRampToValueAtTime(amp.gain.value, audio.currentTime + .01)
				osc.frequency.exponentialRampToValueAtTime(2600, audio.currentTime + .2)
				ocillate(osc, amp, .09)
				if (++i > 6) clearInterval(x)
			}
		aud()
		x = setInterval(aud, 98)
	},
	clearSeq = () => {
		clearInterval(seq)
		clearTimeout(delay)
		;[seq, delay] = [!1, !1]
		if (speechSynthesis.speaking) speechSynthesis.cancel()
	},
	ctrl = (tag, className, txt, func, parentNode = layout, active = !1) => {
		for (const [i, c] of className.entries()) {
			const el = create(tag, parentNode, c)
			el.textContent = txt[i]
			el.addEventListener("pointerdown", () => { playPress(); el.classList.add("active"); active = !0
				document.addEventListener("pointerup", () => { el.classList.remove("active"); active = !1 }, { once: !0 }) })
			el.addEventListener("pointerup", () => { if (active) { el.classList.remove("active"); active = !1; func[i](el) }})
		}
	},
	init = () => {
		while (board.firstChild) board.firstChild.remove()
		const btn = but => {
				if (input.length === limit) return
				if (input.push(opt === "color" ? but.classList[1] : but.textContent) === limit) result()
			}
		panel = create("div", layout, "panel")
		for (let i = 0, b = 0; i < 12;) {
			if (++i === 10 || i === 12) { create("div", panel, "box"); continue }
			if (b === 9) b = -1
			ctrl("div", ["box no-" + (++b)], [""], [el => btn(el)], panel)
		}
		stimulus = create("div", layout, "stimulus")
		main()
	},
	main = () => {
		[panel, stimulus].forEach(el => el.classList.add("hide"))
		if (wl) wl.release().then(() => wl = !1)
		const capFirst = str => str.charAt(0).toUpperCase() + str.slice(1),
			clear = () => {
				[rounds, limit] = [0, range.auto ? range.min - 1 : limit]
				try { $(".result").remove() } catch { /* 0 */ }
				try { help($(".help"), !0) } catch { /* 0 */ }
			},
			level = def => {
				if (!def) {
					limit = range.auto ? range.min : limit === range.max ? range.min - 1 : ++limit
					range.auto = limit < range.min ? !0 : !1
					clear()
				}
				if (limit > range[opt]) limit = range.min - 1
				return range.auto ? "Auto" : "Level " + limit
			},
			speaker = def => { if (!def) sound = !sound; return sound ? "🔊" : "🔇" },
			alt = () => {
				opt = tasks.find((k, i, a) => { let o = a.indexOf(opt) + 1; if (o === a.length) o = 0; return i === o })
				clear()
				return capFirst(opt)
			},
			help = (el, cls) => {
				if (!el.firstChild.nodeValue || cls) return (el.textContent = "?")
				el.firstChild.replaceWith(create("ol"))
				for (const txt of ["Start task on the circle", "Observe the sequence", "Recall the reverse order", "Abort task on the red X"]) create("li", el.firstChild).textContent = txt
			},
			fscreen = () => {
				if (document.fullscreenElement) document.exitFullscreen()
				else board.parentNode.requestFullscreen()
			}
		[stimuli, input, count, rounds] = [[], [], 0, rounds < range.x ? rounds : 0]
		ctrl("p", ["level", "alt", "help"], [level(!0), capFirst(opt), "?"], [el => el.textContent = level(), el => el.textContent = alt(), el => help(el)])
		ctrl("div", ["speaker", "circle"], [speaker(!0), ""], [el => el.textContent = speaker(), () => task[opt]()])
		if (document.fullscreenEnabled) ctrl("div", ["screen"], [""], [fscreen])
		board.append(layout)
	},
	result = () => {
		if (reverse) stimuli = stimuli.reverse()
		const ul = create("ul", layout, "result"),
			format = (a, i) => {
				const wrong = a.map((v, i) => v !== stimuli[i]), li = create("li", ul, "match-li-" + i)
				for (const [i, txt] of a.entries()) {
					const el = create("span", li, (wrong[i] ? "wrong " : "") + "match")
					if (opt === "color") el.classList.add(txt, "color")
					else el.textContent = txt
				}
			}
		setTimeout(() => {
			panel.classList.add("hide")
			if (stimuli.every((v, i) => v === input[i])) {
				if (range.auto) ++rounds
				for (const txt of ["- Well Played -", "Level " + limit, "Memory: " + (limit < 5 ? "Good" : limit < 8 ? "Great" : "Superb")])
					create("li", ul, rounds < range.x ? "" : "complete").textContent = txt
				playSuccess()
				if (rounds === range.x) ++limit
			} else {
				for (const [i, v] of ["- No Match -", stimuli, input].entries()) {
					if (typeof v === "string") create("li", ul).textContent = v
					else format(v, i)
				}
				playBuzzer()
			}
			main()
		}, 150)
	},
	speak = letter => {
		const ltr = new SpeechSynthesisUtterance(letter)
		ltr.lang = lang
		speechSynthesis.speak(ltr)
	},
	run = (s = stimuli[count]) => {
		if (count++ === limit) { clearSeq(); panel.classList.remove("hide"); stimulus.classList.add("hide"); return }
		if (opt === "color") stimulus.classList.add(s, "color")
		else stimulus.textContent = s
		if (sound && dual && opt !== "color") speak(s.toLowerCase())
		setTimeout(() => { stimulus.className = "stimulus"; stimulus.textContent = "" }, time.stimulus)
	},
	runSeq = () => {
		stimulus.classList.remove("hide")
		ctrl("div", ["esc"], [""], [() => { clearSeq(); if (range.auto) limit = range.min - 1; main() }], board)
		if (seq || delay) clearSeq()
		delay = setTimeout(() => { run(); seq = setInterval(run, time.state) }, 1500)
	},
	sequence = (itm, n = 0) => {
		[...board.children].forEach(el => { if (!/panel|stim/.test(el.className)) el.remove() })
		wake()
		speak(" ")
		const a = Array.from({ length: range[opt] }, itm)
		if (opt === "color") panel.classList.add("color")
		else panel.classList.remove("color")
		for (const [i, box] of [...panel.children].entries()) {
			if (opt === "color") { if (i < range[opt]) { box.classList.add("color"); box.textContent = "" } else box.classList.add("hide"); continue }
			box.classList.remove("hide", "color")
			if (box.classList[1]) {
				if (opt === "0-9" && box.classList[1] === "no-0") { box.textContent = a[0]; continue }
				box.textContent = opt === "0-9" ? a[++n] : a[n++]
			}
		}
		while (stimuli.push(a.splice(Math.floor(Math.random() * a.length), 1)[0].toString()) < limit)
		;runSeq()
	},
	task = {
		"0-9": () => sequence((v, i) => i),
		"ABC": () => sequence((v, i) => String.fromCharCode(i + 65)),
		"color": () => sequence((v, i) => "no-" + (i + 1))
	},
	wake = async () => { try { wl = await navigator.wakeLock.request("screen") } catch { /* 0 */ }}
addEventListener("DOMContentLoaded", () => {
	[board, opt, limit, range["color"], range["0-9"], range["ABC"]] = [document.body, tasks[0], range.auto ? range.min - 1 : range.min, 9, 10, 10]
	const fontLoad = async (fam, url, des, fd = "auto") => { const f = new FontFace(fam, "url(" + url + ")", des); f.display = fd; await f.load(); document.fonts.add(f) }
	fontLoad("inter", "resource/font/inter.woff2", { weight: "400 700" }, "swap")
	init()
	document.addEventListener("touchstart", e => e.preventDefault(), { passive: !1 })
	document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") audio.suspend(); else setTimeout(() => audio.resume(), 300) })
	addEventListener("pageshow", () => { const p = performance, n = p.getEntriesByType("navigation")[0] || p.navigation; if (n && /back_f|2/.test(n.type)) setTimeout(() => audio.resume(), 300) })
	speechSynthesis.addEventListener("voiceschanged", () => lang = speechSynthesis.getVoices().find(v => v.lang.substr(0, 2) === navigator.language.substr(0, 2)) ? navigator.language : "en")
	if (location.protocol === "https:") navigator.serviceWorker.register("service-worker.js", { scope: "https://fson4.github.io/bt/" })
}, { once: !0 })
