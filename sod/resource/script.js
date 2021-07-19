"use strict"
let tasks = ["color", "shape", "symbol"],
	time = { slow: 1000, fast: 210 },
	interval = 1000,
	random = { color: 1, shape: 1, symbol: 0 },
	sound = 1,
	[range, xy] = [{ min: 5, max: 9, limit: 6, color: 7, shape: 7, symbol: 7 }, { min: 5, max: 8 }],
	board, opt, grid, limit, mode, clone, same, score, rounds, time1, time2

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
	prep = () => {
		while (board.firstChild) board.firstChild.remove()
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
	main = () => {
		prep()
		const capFirst = str => str.charAt(0).toUpperCase() + str.slice(1),
			clear = () => {
				[score, rounds] = [0, 0]
				try { $(".result").remove() } catch { /* 0 */ }
				help($(".help"), !0)
			},
			setting = def => {
				if (!def) { mode = Object.keys(time).find(k => k !== mode); clear() }
				return capFirst(mode)
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
				for (const txt of ["Start task on the circle", "Observe " + opt + "s", "Note the circled object", "Same or different?"]) create("li", el.firstChild).textContent = txt
			},
			fscreen = () => {
				if (document.fullscreenElement) document.exitFullscreen()
				else board.parentNode.requestFullscreen()
			}
		board.className = ""
		ctrl("p", ["setting", "alt", "help"], [setting(!0), capFirst(opt), "?"], [el => el.textContent = setting(), el => el.textContent = alt(), el => help(el)])
		ctrl("div", ["speaker", "circle"], [speaker(!0), ""], [el => el.textContent = speaker(), task])
		if (document.fullscreenEnabled) ctrl("div", ["screen"], [""], [fscreen])
		board.append(layout)
	},
	result = t => {
		const data = () => Math.round((score / rounds) * 100) + "% (" + score + " / " + rounds + ")"
		setTimeout(() => {
			if ((same && t) || (!same && !t)) {
				++score
				const ul = create("ul", layout, "result success")
				for (const txt of ["- Well Played -", data(), Math.round((time2 - time1) / 10) / 100 + " sec"]) create("li", ul).textContent = txt
				playSuccess()
			} else {
				create("li", create("ul", layout, "result")).textContent = data()
				playBuzzer()
			}
			main()
		}, 100)
	},
	runClone = () => {
		prep()
		time2 = performance.now()
		const el = [...clone.children][0],
			a = Array.from({ length: range[opt] }, (v, i) => opt + "-" + (i + 1))
		same = Math.floor(Math.random() * 2)
		if (!same) {
			a.splice(a.indexOf(el.classList[1]), 1)
			el.className = "box " + a[Math.floor(Math.random() * a.length)]
		}
		el.classList.add("marked")
		ctrl("li", ["true", "false"], ["True", "False"], [() => result(!0), () => result(!1)], create("ul", clone, "buttons"))
		setTimeout(() => board.append(clone), interval)
	},
	task = () => {
		prep()
		let [a, b] = [1, 0]
		const lsc = innerWidth > innerHeight
		grid = Array.from({ length: xy.min * xy.max }, () => { if (b === xy.max) [a, b] = [++a, 0]; return lsc ? a + "/" + (++b) : (++b) + "/" + a })
		board.className = "grid " + opt
		limit = random[opt] ? Math.floor(Math.random() * (range.max - range.min + 1) + range.min) : range.limit
		for (let i = 0; i < limit; ++i) {
			const box = create("div", layout, "box " + opt + "-" + (Math.floor(Math.random() * range[opt]) + 1))
			box.style.gridArea = grid.splice(Math.floor(Math.random() * grid.length), 1)[0]
		}
		++rounds
		clone = layout.cloneNode(!0)
		board.append(layout)
		time1 = performance.now()
		setTimeout(runClone, time[mode])
	}
addEventListener("DOMContentLoaded", () => {
	[board, opt, mode, score, rounds] = [document.body, tasks[0], Object.keys(time)[0], 0, 0]
	const fontLoad = async (fam, url, des, fd = "auto") => { const f = new FontFace(fam, "url(" + url + ")", des); f.display = fd; await f.load(); document.fonts.add(f) }
	fontLoad("inter", "resource/font/inter.woff2", { weight: "400 700" }, "swap")
	main()
	document.addEventListener("touchstart", e => e.preventDefault(), { passive: !1 })
	document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") audio.suspend(); else setTimeout(() => audio.resume(), 300) })
	addEventListener("pageshow", () => { const p = performance, n = p.getEntriesByType("navigation")[0] || p.navigation; if (n && /back_f|2/.test(n.type)) setTimeout(() => audio.resume(), 300) })
	if (location.protocol === "https:") navigator.serviceWorker.register("service-worker.js", { scope: "https://fson4.github.io/sod/" })
	fontLoad("noto", "resource/font/noto.woff2", { weight: "500" })
}, { once: !0 })
