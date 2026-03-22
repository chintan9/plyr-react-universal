import { useCallback as e, useEffect as t, useImperativeHandle as n, useRef as r, useState as i } from "react";
import { Plyr as a } from "plyr-react";
import o from "hls.js";
import { ALL_FORMATS as s, BlobSource as c, BufferTarget as l, Conversion as u, Input as d, Mp4OutputFormat as f, Output as p, StreamTarget as m } from "mediabunny";
import { jsx as h, jsxs as g } from "react/jsx-runtime";
//#region src/logger.ts
var _ = (e, t = !1) => ({
	log: (...n) => t && console.log(`[${e}]`, ...n),
	error: (...n) => t && console.error(`[${e}]`, ...n)
});
//#endregion
//#region src/useUniversalMedia.ts
function v(e, n) {
	let [r, a] = i(null), [o, h] = i(null), [g, v] = i(!1), [y, b] = i(0), [x, S] = i("idle"), [C, w] = i(null), [T, E] = i(e);
	e !== T && (E(e), a(null), h(null), v(!1), b(0), S("idle"), w(null));
	let D = _("UniversalMedia", n?.debug), O = n?.mode ?? "stream";
	return t(() => {
		if (!e) return;
		let t = !1, r = null, i = null, o = null;
		return (async () => {
			if (await Promise.resolve(), !t) {
				if (typeof e == "string") {
					D.log("Remote URL detected."), v(e.includes(".m3u8")), a(e), S("ready");
					return;
				}
				if (v(!1), e.type === "video/mp4" || e.type === "video/webm") {
					D.log("Web-safe format. Direct playback."), o = URL.createObjectURL(e), a(o), S("ready");
					return;
				}
				D.log(`Non-web format. Starting conversion in [${O}] mode...`), S("converting"), b(0), w(null);
				try {
					let g = new d({
						formats: s,
						source: new c(e)
					});
					if (O === "buffer") {
						let e = new p({
							format: new f({ fastStart: n?.fastStart ?? "in-memory" }),
							target: new l()
						});
						if (r = await u.init({
							input: g,
							output: e
						}), r.onProgress = (e) => {
							t || b(e);
						}, await r.execute(), t) return;
						let i = e.target.buffer;
						i && (o = URL.createObjectURL(new Blob([i], { type: "video/mp4" })), a(o), S("ready"));
					} else {
						if (i = new MediaSource(), o = URL.createObjectURL(i), h({
							type: "video",
							sources: [{
								src: o,
								type: "video/mp4"
							}]
						}), await new Promise((e, t) => {
							i.addEventListener("sourceopen", () => e(), { once: !0 }), i.addEventListener("error", t, { once: !0 });
						}), t) return;
						let e = null, n = null, a = new WritableStream({ async write(r) {
							if (!t) {
								if (!e && n) {
									let t = await n.getMimeType();
									i?.readyState === "open" && (e = i.addSourceBuffer(t));
								}
								t || i?.readyState !== "open" || (e.appendBuffer(r.data), await new Promise((t, n) => {
									e.addEventListener("updateend", () => t(), { once: !0 }), e.addEventListener("error", n, { once: !0 });
								}));
							}
						} });
						if (n = new p({
							format: new f({
								fastStart: "fragmented",
								minimumFragmentDuration: 1
							}),
							target: new m(a, { chunked: !0 })
						}), r = await u.init({
							input: g,
							output: n
						}), r.onProgress = (e) => {
							t || b(e);
						}, await r.execute(), t) return;
						i?.readyState === "open" && i.endOfStream(), S("ready");
					}
				} catch (e) {
					t || (D.error("Processing Error:", e), w(e instanceof Error ? e : Error(String(e))), S("error"), i?.readyState === "open" && i.endOfStream("decode"));
				}
			}
		})(), () => {
			if (t = !0, D.log("Cleaning up resources..."), r && r.cancel().catch(() => {}), o) {
				let e = o;
				setTimeout(() => URL.revokeObjectURL(e), 1e3);
			}
		};
	}, [
		e,
		O,
		n?.fastStart,
		D
	]), {
		playableUrl: r,
		source: o,
		isHls: g,
		status: x,
		progress: y,
		error: C
	};
}
//#endregion
//#region src/UniversalPlyr.tsx
function y({ ref: i, fileOrUrl: s, plyrOptions: c = {}, hlsConfig: l = {}, conversionConfig: u, onReady: d, onError: f, onProgress: p, onConversionStart: m, onConversionComplete: y, onHlsReady: b, autoplay: x = !0, debug: S = !1, renderLoading: C, renderError: w, className: T, style: E }) {
	let D = _("UniversalPlyr", S), { playableUrl: O, source: k, isHls: A, status: j, progress: M, error: N } = v(s, {
		...u,
		debug: S
	}), P = r(null), F = r(null), I = r(j);
	n(i, () => ({
		plyr: P.current,
		hls: F.current,
		getPlayableUrl: () => O,
		getStatus: () => j,
		getProgress: () => M
	}));
	let L = e(() => {
		F.current &&= (D.log("Destroying HLS instance..."), F.current.destroy(), null);
	}, [D]);
	t(() => {
		j === "converting" && I.current !== "converting" && m?.(), j === "ready" && I.current === "converting" && y?.(), j === "error" && f?.(N || /* @__PURE__ */ Error("Media loading failed")), I.current = j;
	}, [
		j,
		N,
		m,
		y,
		f
	]), t(() => {
		p?.(M);
	}, [M, p]), t(() => {
		if (!O || !A || !P.current) {
			L();
			return;
		}
		let e = P.current.plyr?.media;
		if (!e) {
			L();
			return;
		}
		if (o.isSupported()) {
			D.log("Initializing HLS.js engine...");
			let t = new o({
				enableWorker: !0,
				...l
			});
			return t.loadSource(O), t.attachMedia(e), t.on(o.Events.MANIFEST_PARSED, () => {
				d?.(), b?.(t);
			}), t.on(o.Events.ERROR, (e, t) => {
				t.fatal && (D.error("Fatal HLS error:", t), f?.(/* @__PURE__ */ Error(`HLS Error: ${t.type}`)));
			}), F.current = t, L;
		} else e.canPlayType("application/vnd.apple.mpegurl") && (D.log("Using native Safari HLS."), e.setAttribute("src", O), d?.());
		return L;
	}, [
		O,
		A,
		l,
		d,
		b,
		f,
		L,
		D
	]);
	let R = k || (A ? null : O ? {
		type: "video",
		sources: [{
			src: O,
			type: "video/mp4"
		}]
	} : null);
	return /* @__PURE__ */ g("div", {
		className: T,
		style: {
			position: "relative",
			width: "100%",
			...E
		},
		children: [/* @__PURE__ */ g("div", {
			style: {
				position: "absolute",
				inset: 0,
				pointerEvents: "none",
				zIndex: 10
			},
			children: [j === "error" && w && w(N), j === "converting" && C && C(M)]
		}), R !== null || A ? /* @__PURE__ */ h(a, {
			ref: P,
			source: R,
			options: {
				autoplay: x,
				...c
			}
		}) : null]
	});
}
//#endregion
export { y as UniversalPlyr, v as useUniversalMedia };
