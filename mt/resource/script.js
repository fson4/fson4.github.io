"use strict"
let tasks = ["numeral", "arrow", "ABC"],
	time = { medium: 1500, hard: 210 },
	reverse = { numeral: 0, arrow: "0-1", ABC: 0 },
	random = { numeral: 1, arrow: 1, ABC: 0 },
	sound = 1,
	[range, xy] = [{ min: 5, max: 9 }, { min: 5, max: 8 }],
	board, opt, grid, index, limit, mode, clone, score, rounds, time1, time2

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
	prep = controls => {
		while (board.firstChild) board.firstChild.remove()
		if (controls) return (board.className = opt)
		let [a, b] = [1, 0]
		const lsc = innerWidth > innerHeight
		grid = Array.from({ length: xy.min * xy.max }, () => { if (b === xy.max) [a, b] = [++a, 0]; return lsc ? a + "/" + (++b) : (++b) + "/" + a })
		index = Array.from({ length: limit }, (v, i) => i)
		board.className = "grid"
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
		prep(!0)
		const help = (el, cls) => {
				if (!el.firstChild.nodeValue || cls) return (el.textContent = "?")
				el.firstChild.replaceWith(create("ol"))
				for (const txt of ["Choose difficulty", "Start task on the circle", "Observe " + opt + "s", "Press the right order"]) create("li", el.firstChild).textContent = txt
			},
			speaker = def => { if (!def) sound = !sound; return sound ? "🔊" : "🔇" },
			alt = () => { board.className = (opt = tasks.find((k, i, a) => { let o = a.indexOf(opt) + 1; if (o === a.length) o = 0; return i === o })); help($(".help"), !0) },
			menu = el => { mode = el.textContent.toLowerCase(); start() },
			dwnl = () => open("https://github.com/fson4/fson4.github.io", "_blank", "noopener"),
			fscreen = () => {
				if (document.fullscreenElement) document.exitFullscreen()
				else board.parentNode.requestFullscreen()
			}
		[limit, score, rounds] = [range.min, 0, 0]
		ctrl("p", ["help", "alt", "dwnl"], ["?", "⎇", "Download"], [el => help(el), alt, dwnl])
		ctrl("div", ["speaker"], [speaker(!0)], [el => el.textContent = speaker()])
		ctrl("li", Array(3), ["Easy", "Medium", "Hard"], Array(3).fill(el => menu(el)), create("ul", layout, "menu"))
		if (document.fullscreenEnabled) ctrl("div", ["screen"], [""], [fscreen])
		board.append(layout)
	},
	start = () => {
		prep(!0)
		const level = def => {
				if (!def) {
					[limit, score, rounds] = [limit === range.max ? range.min : ++limit, 0, 0]
					try { $(".result").remove() } catch { /* 0 */ }
				}
				return "Level " + limit
			}
		ctrl("p", ["level", "return"], [level(!0), "Return"], [el => el.textContent = level(), main])
		ctrl("div", ["circle"], [""], [task[opt]])
		board.append(layout)
		if (/-|^$/.test(reverse[opt])) {
			reverse[opt] = Math.floor(Math.random() * 2) ? "-" : ""
			$(".circle").classList.add(reverse[opt] ? "minus" : "plus")
		}
	},
	result = (box, item) => {
		const data = () => Math.round((score / rounds) * 100) + "% (" + score + " / " + rounds + ")"
		if (index.length) {
			box.className = "box red"
			box.append(item)
			playBuzzer()
			create("li", create("ul", layout, "result")).textContent = data()
			return setTimeout(start, 800)
		}
		++score
		const ul = create("ul", layout, "result success")
		for (const txt of ["- Well Played -", data(), Math.round((time2 - time1) / 10) / 100 + " sec"]) create("li", ul).textContent = txt
		start()
		playSuccess()
	},
	setBox = item => {
		const box = create("div", layout, "box")
		box.style.gridArea = grid.splice(Math.floor(Math.random() * grid.length), 1)[0]
		box.append(item)
	},
	mask = () => {
		time2 = performance.now()
		for (const box of board.children) {
			box.firstChild.remove()
			box.className = "box mask"
		}
		board.addEventListener("pointerdown", unmask)
	},
	unmask = (e, box = e.target.closest(".mask")) => {
		if (!box) return
		box.className = "box"
		const i = [...board.children].indexOf(box)
		if (i !== (reverse[opt] ? index.pop() : index.shift()) || !index.length) {
			board.removeEventListener("pointerdown", unmask)
			result(box, clone.children[i].firstChild)
		} else playPress()
	},
	masker = (e, box = e.target.closest(".box")) => {
		if (!box) return
		board.removeEventListener("pointerdown", masker)
		mask()
		unmask(e, box)
	},
	run = () => {
		++rounds
		clone = layout.cloneNode(!0)
		board.append(layout)
		time1 = performance.now()
		if (mode !== "easy") setTimeout(mask, time[mode])
		else board.addEventListener("pointerdown", masker)
	},
	chars = chr => {
		prep()
		const a = Array.from({ length: range.max }, chr)
		if (random[opt]) while (a.length > limit) a.splice(Math.floor(Math.random() * a.length), 1)
		for (let i = 0; i < limit && i < 26;) setBox(a[i++])
		run()
	},
	task = {
		numeral: () => chars((v, i) => i + 1),
		arrow: () => {
			prep()
			const sector = Number((360 / limit).toFixed(2))
			for (let i = 0, deg = random[opt] ? sector - 4 : sector; i < limit; ++i, deg += sector) {
				const el = create("div")
				el.style.transform = "rotate(" + Math.round(random[opt] ? deg - Math.floor(Math.random() * (sector - 7)) : deg - (sector / 2)) + "deg)"
				setBox(el)
			}
			run()
		},
		ABC: () => chars((v, i) => String.fromCharCode(i + 65))
	}
addEventListener("DOMContentLoaded", () => {
	[board, opt] = [document.body, tasks[0]]
	const fontLoad = async (fam, url, des, fd = "auto") => { const f = new FontFace(fam, "url(" + url + ")", des); f.display = fd; await f.load(); document.fonts.add(f) }
	fontLoad("inter", "resource/font/inter.woff2", { weight: "400 700" }, "swap")
	main()
	document.addEventListener("touchstart", e => e.preventDefault(), { passive: !1 })
	document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") audio.suspend(); else setTimeout(() => audio.resume(), 300) })
	addEventListener("pageshow", () => { const p = performance, n = p.getEntriesByType("navigation")[0] || p.navigation; if (n && /back_f|2/.test(n.type)) setTimeout(() => audio.resume(), 300) })
	if (location.protocol === "https:") navigator.serviceWorker.register("service-worker.js", { scope: "https://fson4.github.io/mt/" })
}, { once: !0 })
