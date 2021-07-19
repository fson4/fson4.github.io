"use strict"
let block = { a: 10, b: 20, c: 40 },
	targets = { a: 3, b: 6, c: 12 },
	time = { state: 3000, stimulus: 500 },
	dual = 1,
	sound = 1,
	range = { min: 1, max: 6, start: 2 },
	aural = ["c", "f", "g", "j", "k", "p", "q", "w"],
	board, key, grid, visual, visMatch, aurMatch, stateV, stateA, N, count, right, wrong, prssd, seq, delay, wl, lang

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
	playResult = () => {
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
	prep = () => {
		[...board.children].forEach(el => { if (el.className !== "grid") el.remove() })
		while (board.firstChild && board.firstChild.nodeValue) board.firstChild.remove()
		clearSeq()
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
		grid = create("div", layout, "grid")
		for (let i = 0, n = 0; i < 9;) {
			if (i++ === 4) {
				ctrl("div", ["circle"], [""], [task], grid)
				continue
			}
			create("div", grid, "box no-" + (++n))
			visual.push(".no-" + n)
		}
		main()
	},
	main = () => {
		prep()
		if (wl) wl.release().then(() => wl = !1)
		const clear = () => {
				try { $(".result").remove() } catch { /* 0 */ }
				try { help($(".help"), !0) } catch { /* 0 */ }
			},
			setN = def => {
				if (!def) { N = N === range.max ? range.min : ++N; clear() }
				return N + " back"
			},
			speaker = def => { if (!def) sound = !sound; clear(); return sound ? "🔊" : "🔇" },
			setB = def => {
				if (!def) { key = Object.keys(block).find((v, i, a) => { let o = a.indexOf(key) + 1; if (o === a.length) o = 0; return i === o }); clear() }
				count = block[key]
				return "X " + block[key]
			},
			help = (el, cls) => {
				if (!el.firstChild.nodeValue || cls) return (el.textContent = "?")
				el.firstChild.replaceWith(create("ol"))
				for (const txt of ["Start task on the circle", "Note squares" + (sound && dual ? " and audio" : ""), "Match " + N + " state" + (N > 1 ? "s" : "") +
					" back", "End task on the center cross"]) create("li", el.firstChild).textContent = txt
			},
			fscreen = () => {
				if (document.fullscreenElement) document.exitFullscreen()
				else board.parentNode.requestFullscreen()
			}
		[right, wrong] = [0, 0]
		ctrl("p", ["set-n", "set-b", "help"], [setN(!0), setB(!0), "?"], [el => el.textContent = setN(), el => el.textContent = setB(), el => help(el)])
		ctrl("div", ["speaker"], [speaker(!0)], [el => el.textContent = speaker()])
		if (document.fullscreenEnabled) ctrl("div", ["screen"], [""], [fscreen])
		board.append(layout)
	},
	result = () => {
		const ul = create("ul", board, "result"), r = right - wrong, t = sound && dual ? targets[key] * 2 : targets[key]
		for (const txt of ["Index: " + (r > 0 ? Math.round((r / t) * 100) : 0) + "%", "Right press: " + right + " / "  + t, "Wrong press: " + wrong])
			create("li", ul).textContent = txt
		playResult()
	},
	speak = letter => {
		const ltr = new SpeechSynthesisUtterance(letter)
		ltr.lang = lang
		speechSynthesis.speak(ltr)
	},
	build = stimuli => {
		if (N + targets[key] >= block[key]) return board.prepend("[insane value] ")
		const array = () => Array.from({ length: block[key] }, () => stimuli[Math.floor(Math.random() * stimuli.length)]),
			tar = () => {
				const p = []
				a.forEach((v, i) => { if (i < block[key] - N && v === a[i + N]) p.push(i + N) })
				return p
			}
		let a = array()
		while (new Set(a).size < 3) a = array()
		while (tar().length < targets[key]) {
			const t = Math.floor(Math.random() * (block[key] - N) + N),
				from = t - N
			a.copyWithin(t, from, (from + 1))
		}
		while (tar().length > targets[key]) {
			let i = tar()[Math.floor(Math.random() * tar().length)]
			const v = a[Math.floor(Math.random() * block[key])]
			while (a[i] === a[i - N] && a[i] === a[i + N]) i = i - N
			if (v !== a[i] && v !== a[i - N] && v !== a[i + N]) a[i] = v
		}
		return a
	},
	btn = (match, but) => {
		if (prssd[but]) return
		if (match) ++right
		else ++wrong
		prssd[but] = !0
	},
	run = () => {
		if (--count === -1) { clearSeq(); return result() }
		[prssd.eye, prssd.ear] = [!1, !1]
		const vis = stateV[count],
			aur = stateA[count],
			el = $(vis)
		visMatch = vis === stateV[count + N]
		aurMatch = aur === stateA[count + N]
		el.classList.add("visual")
		if (sound && dual) speak(aur)
		setTimeout(() => el.classList.remove("visual"), time.stimulus)
	},
	task = () => {
		if (board.classList.contains("task") || $(".result")) { board.className = ""; return main() }
		prep()
		wake()
		speak(" ")
		board.classList.add("task", "trfx")
		ctrl("li", Array(sound && dual ? 2 : 1).fill(""), ["Eye", "Ear"], [() => btn(visMatch, "eye"), () => btn(aurMatch, "ear")], create("ul", board, "buttons"))
		stateV = build(visual)
		stateA = build(aural)
		$(".circle").addEventListener("animationend", () => {
			board.classList.remove("trfx")
			if (seq || delay) clearSeq()
			delay = setTimeout(() => { run(); seq = setInterval(run, time.state) }, 1500)
		}, { once: !0 })
	},
	wake = async () => { try { wl = await navigator.wakeLock.request("screen") } catch { /* 0 */ }}
addEventListener("DOMContentLoaded", () => {
	[board, N, visual, key, prssd] = [document.body, range.start, [], Object.keys(block)[0], { eye: !1, ear: !1 }]
	const fontLoad = async (fam, url, des, fd = "auto") => { const f = new FontFace(fam, "url(" + url + ")", des); f.display = fd; await f.load(); document.fonts.add(f) }
	fontLoad("inter", "resource/font/inter.woff2", { weight: "400 700" }, "swap")
	init()
	document.addEventListener("touchstart", e => e.preventDefault(), { passive: !1 })
	document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") audio.suspend(); else setTimeout(() => audio.resume(), 300) })
	addEventListener("pageshow", () => { const p = performance, n = p.getEntriesByType("navigation")[0] || p.navigation; if (n && /back_f|2/.test(n.type)) setTimeout(() => audio.resume(), 300) })
	speechSynthesis.addEventListener("voiceschanged", () => lang = speechSynthesis.getVoices().find(v => v.lang.substr(0, 2) === navigator.language.substr(0, 2)) ? navigator.language : "en")
	if (location.protocol === "https:") navigator.serviceWorker.register("service-worker.js", { scope: "https://fson4.github.io/nb/" })
}, { once: !0 })
