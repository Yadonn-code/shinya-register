(() => {
const W = 960, H = 560;
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = id => document.getElementById(id);
const cv = $('cv'), ctx = cv.getContext('2d');
const STORE = '#3fae8c';

function resize(){
  const r = cv.getBoundingClientRect(), d = Math.min(window.devicePixelRatio || 1, 2);
  cv.width = Math.max(1, Math.round(r.width * d)); cv.height = Math.max(1, Math.round(r.height * d));
  ctx.setTransform(cv.width / W, 0, 0, cv.height / H, 0, 0);
}
new ResizeObserver(resize).observe(cv); resize();

const lerp = (a, b, k) => a + (b - a) * k;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
function rng(seed){ return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function ell(g, x, y, rx, ry){ g.beginPath(); g.ellipse(x, y, Math.max(.1, rx), Math.max(.1, ry), 0, 0, Math.PI * 2); g.fill(); }
function mk(w, h){ const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

/* ---------- 客の名簿と、一夜の組み立て ---------- */
// 名簿に書くのは各客の違いだけ。チャイム・影・カメラは、指定がなければ「あり」
const POOL = {
  human: [
    { who:'会社員風の男',
      look:{ h:1.0, coat:'#2b2f3a', pants:'#22252c', shirt:'#d9dcd8', skin:'#d9b9a0', hair:'short', hairC:'#1b1a1a', tie:'#6b2a2a', glasses:true, lapel:true, stubble:true, feet:'leather', shoes:'#141414', seed:300 },
      desc:'くたびれたスーツ。ネクタイが緩んでいる。', line:'……あ、袋いらないです。', items:['鮭おにぎり','缶コーヒー（微糖）'],
      aText:'「どうも」男は小さく会釈して、夜の駐車場へ戻っていった。', rText:'男はしばらく待ってから舌打ちをして、商品を棚に戻した。' },
    { who:'大学生くらいの女性',
      look:{ h:.93, coat:'#8a7f9e', pants:'#3a4560', skin:'#e6c6ae', hair:'bob', hairC:'#3a2a20', cardigan:true, inner:'#ebe7df', buttons:true, feet:'sneaker', shoes:'#d8d4cc', seed:1700 },
      desc:'イヤホンを片耳だけ外している。', line:'ポイントカード……あ、持ってないです。', items:['バニラアイス ×3','ファッション誌'],
      aText:'「ありがとうございまーす」軽い足取りで出ていった。', rText:'「え、無視？」女性はスマホに何か打ち込みながら出ていった。' },
    { who:'酔った中年男', camExtra:true,
      look:{ h:1.0, coat:'#4a4f45', pants:'#2e302b', shirt:'#cfcabc', skin:'#d9978a', hair:'messy', hairC:'#3a3835', tie:'#2c3b5a', sway:true, flush:true, lapel:true, stubble:true, feet:'leather', shoes:'#2a1f18', seed:900 },
      desc:'顔が赤い。足元がふらついている。', line:'おーい、研修中くん！\n……お前の後ろ、誰か立ってるぞぉ。はっはっは', items:['ストロング缶 500ml','からあげ棒'],
      aText:'男は上機嫌で出ていった。……後ろは、振り返らないでおいた。', rText:'「なんだぁ、愛想ねえなあ！」男はカウンターを叩いて出ていった。' },
    { who:'小柄な老婆',
      look:{ h:.8, coat:'#5d4d5c', pants:'#3d3438', skin:'#d7bfae', hair:'bun', hairC:'#b9b9b6', stoop:true, old:true, cardigan:true, inner:'#cfc6bb', buttons:true, feet:'leather', shoes:'#2a2a2a', seed:2400 },
      desc:'背中を丸めて、小銭入れを握りしめている。', line:'お仏壇のね、ろうそくが切れちゃって。\n……今夜は、たくさん要るのよ', items:['ろうそく（徳用）×4','マッチ'],
      aText:'「ありがとうねえ」老婆は何度も頭を下げて帰っていった。', rText:'老婆は困ったように立ち尽くし、やがて小銭入れをしまって出ていった。' },
    { who:'パジャマの男の子',
      look:{ h:.6, hs:1.3, coat:'#7aa0c4', pants:'#7aa0c4', skin:'#efcfb8', hair:'short', hairC:'#2a1d14', shoes:'#c84a3c', kid:true, pj:true, buttons:true, feet:'sandal', seed:1200 },
      desc:'裸足にサンダル。小銭を握った手が震えている。', line:'お母さんが、ねつ、でてて……\nこれで、たりる？', items:['冷却シート','スポーツドリンク'],
      aText:'少し足りない分は、黙って自分の財布から出した。男の子は何度も振り返りながら走っていった。', rText:'男の子は泣きそうな顔で立っていたが、やがて商品を置いて出ていった。' },
    { who:'作業着の男', late:true,
      look:{ h:1.0, coat:'#4b5563', pants:'#3d4350', vest:'#d98a2b', skin:'#c69a7a', hair:'short', hairC:'#222222', helmet:true, stubble:true, feet:'boots', shoes:'#3a2c1e', seed:500 },
      desc:'ヘルメットを小脇に抱えている。夜明け前の現場に向かうらしい。', line:'研修中さんか。朝までご苦労さん。', items:['おにぎり ×3','緑茶 2L'],
      aText:'「頑張れよ」男はヘルメットをかぶり直して出ていった。外が、少しだけ明るい。', rText:'「……おい、聞こえてるか？」男は首をかしげ、隣の店へ向かった。' },
    { who:'夜勤明けの看護師', late:true,
      look:{ h:.92, coat:'#9cc3cf', pants:'#9cc3cf', skin:'#e3c8b4', hair:'bun', hairC:'#2a1f18', feet:'sneaker', shoes:'#f0efe9', seed:800 },
      desc:'くすんだ水色の上着。目の下に、濃いクマがある。', line:'……温かいお茶、ありますか。\nさっきまで、ずっと立ちっぱなしで。', items:['ほうじ茶（ホット）','あんぱん'],
      aText:'「ありがと。夜勤、お互いがんばろうね」彼女は少しだけ笑って出ていった。', rText:'彼女は小さくため息をついて、何も買わずに出ていった。' },
    { who:'喪服の男',
      look:{ h:1.02, coat:'#111214', pants:'#111214', shirt:'#ecece8', skin:'#d2b49c', hair:'short', hairC:'#4a4744', tie:'#0a0a0a', lapel:true, old:true, feet:'leather', shoes:'#050505', seed:1500 },
      desc:'喪服を着ている。目が赤い。', line:'香典袋と……黒いボールペンを。\n急に、知らせがあって。', items:['香典袋','ボールペン（黒）'],
      aText:'男は深く頭を下げて、夜の中へ戻っていった。', rText:'男は何も言わず、しばらく俯いてから出ていった。' },
    { who:'黒ずくめの女性',
      look:{ h:.94, coat:'#141016', pants:'#141016', legs:'#e9dfda', socks:'#0e0c10', skirtLen:.35, skin:'#ece2dc', hair:'long', hairC:'#0a090b', pale:true, feet:'boots', shoes:'#0e0c0c', seed:2600 },
      desc:'真っ黒な服に、真っ白な化粧。爪も黒い。', line:'これと、これ。……あ、レシートはいらない。', items:['ブラックコーヒー','板チョコ'],
      aText:'「どうも」彼女はイヤホンを付け直して出ていった。ちゃんと、チャイムが鳴った。', rText:'「……感じわる」彼女は商品を置いて出ていった。' },
    { who:'釣り帰りの男',
      look:{ h:1.0, coat:'#3d4a3a', pants:'#2e352c', skin:'#c49a7c', hair:'messy', hairC:'#2b2824', stubble:true, wet:true, feet:'boots', shoes:'#2c3a2c', seed:3100 },
      desc:'釣り竿を背負っている。服の裾が濡れて、少し生臭い。', line:'夜釣りの帰りでさ。氷、あるかい？\n一番でかいやつ。', items:['ロックアイス 4kg','缶ビール'],
      aText:'「今夜はボウズだったよ」男は笑って出ていった。床の水たまりは、ちゃんと足跡の形をしていた。', rText:'「おーい……？」男は首をかしげて、氷を冷凍庫に戻した。' },
    { who:'配送ドライバー',
      look:{ h:1.0, coat:'#2f4f7a', pants:'#26344a', inner:'#d8dde4', cardigan:true, skin:'#d0ab8f', hair:'short', hairC:'#1e1c1a', feet:'sneaker', shoes:'#2a2a2a', seed:3600 },
      desc:'配送業者の制服。伝票の束を持っている。', line:'すみません、エナジードリンク二本。\nあと、トイレ借りても？', items:['エナジードリンク ×2'],
      aText:'「助かります」男は小走りに出ていった。トラックのライトが遠ざかる。', rText:'男は時計を見て舌打ちし、慌てて出ていった。' },
    { who:'手を痛めた男',
      look:{ h:1.0, coat:'#5a5048', pants:'#2e2c2a', shirt:'#cfcbc2', skin:'#d6b8a0', hair:'short', hairC:'#26221e', bandage:'L', lapel:true, feet:'sneaker', shoes:'#8a8a86', seed:4100 },
      desc:'左手に、白い包帯を巻いている。', line:'湿布ってあります？\nちょっと、ひねっちゃって。', items:['湿布','テーピング'],
      aText:'「どうも」男は包帯の手をかばいながら出ていった。', rText:'男は困ったように店内を一周して、出ていった。' },
  ],
  noChime: [
    { who:'ずぶ濡れの女', chime:false,
      look:{ h:.97, coat:'#c3cac9', pants:'#c3cac9', skin:'#b6c2c0', hair:'long', hairC:'#0b0c0c', faceHidden:true, wet:true, legs:'#b6c2c0', skirtLen:.75, pale:true, stare:true, feet:'bare', shoes:'#c3cac9', seed:0 },
      desc:'長い髪から、ぽたぽたと水が落ちている。外は、雨なんて降っていない。', line:'……かさ……ありますか……', items:[],
      aText:'「ありがとう」傘を受け取った手は、水の底みたいに冷たかった。気づくと、レジの内側の床が足首まで濡れている。',
      rText:'目を伏せたまま、ゆっくり十まで数えた。顔を上げると、レジ前には水たまりだけが残っていた。' },
    { who:'傘をついた老人', chime:false,
      look:{ h:.86, coat:'#3a3a40', pants:'#2a2a2e', shirt:'#cfcac0', skin:'#cbb8a8', hair:'short', hairC:'#a9a9a6', old:true, stoop:true, stare:true, feet:'leather', shoes:'#1a1a1a', seed:0 },
      desc:'濡れていない傘を、杖のようについている。', line:'……ここは、まだ開いていますか。', items:['線香'],
      aText:'お釣りを渡そうとした手を、老人の手がつかんだ。体温がなかった。「ありがとう。また、迎えに来ますね」',
      rText:'目を伏せていると、傘の先が床を打つ音だけが遠ざかっていった。ドアは、一度も開かなかった。' },
  ],
  noShadow: [
    { who:'黒いスーツの男', shadow:false,
      look:{ h:1.08, coat:'#0e0f12', pants:'#0e0f12', shirt:'#cfd2cf', skin:'#cfc4bb', hair:'slick', hairC:'#070707', tie:'#070707', lapel:true, feet:'leather', shoes:'#050505', seed:0 },
      desc:'背が高い。物腰がやけに丁寧だ。', line:'夜分に失礼いたします。こちらを、いただけますか。', items:['食塩 1kg'],
      aText:'塩の袋をスキャンした瞬間、男の口が耳まで裂けた。「ありがとうございます。これで、店ごと清められる」',
      rText:'レジの縁を見つめたまま動かなかった。男はしばらく黙って立っていたが、やがて自動ドアから出ていった。チャイムは鳴らなかった。' },
    { who:'白いワンピースの少女', shadow:false,
      look:{ h:.62, hs:1.3, kid:true, coat:'#e9e6e0', pants:'#e9e6e0', legs:'#e8d6cc', skirtLen:.6, skin:'#e8d6cc', hair:'long', hairC:'#0d0c0c', pale:true, stare:true, feet:'bare', shoes:'#e8d6cc', seed:0 },
      desc:'こんな時間に、裸足の女の子。にこりともしない。', line:'おかあさん、さがしてるの。\n……ここに、いる？', items:[],
      aText:'「いた」少女はあなたの足元を指さした。そこにあるはずの影が、少しだけ欠けていた。',
      rText:'目を伏せていると、小さな足音がカウンターの内側へ回り込もうとして、止まった。顔を上げると、誰もいなかった。' },
  ],
  trap: [ // 午前3時の赤いルールを試しに来る、影のない客
    { who:'笑顔の男', shadow:false,
      look:{ h:1.02, coat:'#6d6a5c', pants:'#3a3a34', shirt:'#d8d2c2', skin:'#d6c1ad', hair:'short', hairC:'#2a2622', smile:true, stare:true, lapel:true, feet:'leather', shoes:'#1a1a1a', seed:0 },
      desc:'ずっと笑っている。瞬きを、していない。', line:'三時、過ぎましたよね。\n……だったら、いいでしょう？　お会計を。', items:['カッターナイフ'],
      aText:'「ほら、書いてあったでしょう？」男はカッターを受け取ると、刃をゆっくり押し出した。',
      rText:'赤い字のルールは無視した。目を伏せていると、男の笑い声だけが、だんだん遠ざかっていった。' },
    { who:'丁寧な口調の女', shadow:false,
      look:{ h:.94, coat:'#5b2d34', pants:'#2a2426', skin:'#e2c8b6', hair:'bob', hairC:'#141212', stare:true, feet:'leather', shoes:'#1a1212', seed:0 },
      desc:'品のいいコート。足元が、なんだか明るい。', line:'新しいルール、もう読みました？\n……読んだなら、わかりますよね。', items:['赤ボールペン'],
      aText:'赤ボールペンを受け取ると、女は嬉しそうにマニュアルのページを一枚、書き足すしぐさをした。「次は、何て書こうかしら」',
      rText:'赤い字は、前任者の字じゃない。目を伏せていると、「残念」とだけ聞こえて、気配が消えた。' },
  ],
  noCam: [
    { who:'パーカーの青年', cam:false, scare:'cam',
      look:{ h:.98, coat:'#3c4a3f', pants:'#25292a', skin:'#d8bca6', hair:'short', hairC:'#1d1b19', hood:true, feet:'sneaker', shoes:'#e0ddd6', seed:0 },
      desc:'フードを浅くかぶっている。ごく普通の客に見える。', line:'肉まん、ひとつ。', items:['肉まん'],
      aText:'肉まんを差し出しながら、ふとモニターを見た。画面の中のあなたは、誰もいない空間に向かって笑っていた。',
      rText:'目を伏せてやり過ごした。あとで録画を確かめると、その時間のレジには、あなたしか映っていなかった。' },
    { who:'仕事帰りの女性', cam:false, scare:'cam',
      look:{ h:.93, coat:'#3a3f48', pants:'#2a2e36', shirt:'#e6e4de', skin:'#e2c6b2', hair:'bob', hairC:'#2a201a', glasses:true, lapel:true, feet:'leather', shoes:'#1a1a1a', seed:0 },
      desc:'疲れた顔をしている。何度も後ろを気にしている。', line:'おでん、大根と卵で。\n……さっきから、誰かに見られてる気がして。', items:['おでん（大根・卵）'],
      aText:'容器を渡したとき、モニターの中のあなたは、空中におでんを差し出していた。',
      rText:'目を伏せてやり過ごした。録画を確かめると、その時間、おでん鍋の蓋だけがひとりでに開いていた。' },
  ],
  nameCall: [
    { who:'制服の女子高生',
      look:{ h:.9, coat:'#1f2440', pants:'#1f2440', legs:'#e6cdb9', skin:'#ead0bd', hair:'long', hairC:'#0f0f12', collar:true, stare:true, socks:'#1b1e33', skirtLen:.3, feet:'leather', shoes:'#2a1a12', seed:0 },
      desc:'こんな時間に、制服姿。じっとこちらを見ている。', line:'{name}さん、だよね？\n……ずっと、見てたよ。', items:['ミルクティー'],
      aText:'「やっぱり{name}さんだ」彼女は嬉しそうにレシートを受け取った。「じゃあ、明日も来るね。明日も、明後日も」',
      rText:'名札には「研修中」としか書いていない。目を伏せていると、耳元で「つまんないの」と声がした。顔を上げたとき、店には誰もいなかった。' },
    { who:'近所のおばさん',
      look:{ h:.86, coat:'#7a6a5c', pants:'#4a4038', inner:'#e2d8cc', cardigan:true, buttons:true, skin:'#dcc2ae', hair:'bun', hairC:'#3a2e26', feet:'leather', shoes:'#3a2a20', seed:0 },
      desc:'人のよさそうな中年女性。親しげに笑いかけてくる。', line:'あら、{name}ちゃんじゃない。大きくなったわねえ。\n……覚えてない？　私よ。', items:['牛乳','食パン'],
      aText:'「今度、おうちに遊びに行くわね。場所は、ちゃんと知ってるから」',
      rText:'名札には「研修中」としか書いていない。目を伏せていると、「……あら、人違いだったかしら」と声がして、気配が消えた。' },
  ],
  honbu: [
    { display:'0120-4XX-XXX 本部',
      aText:'「本部です。夜分にすみません。……そちら、変わりないですか？　そうですか。マニュアルは、必ず守ってくださいね」',
      rText:'電話は二十回鳴って切れた。朝になったら、本部から「夜勤が電話に出ない」と連絡が来るだろう。' },
    { display:'0120-4XX-XXX 本部',
      aText:'「本部です。……そちら、今夜は何人で回してますか？　……一人？　そうですか。いえ、それなら大丈夫です」',
      rText:'電話は鳴り続けて、切れた。翌朝、本部の担当者に「夜中に電話したんですけど」と言われることになる。' },
  ],
  unknown: [
    { display:'非通知',
      aText:'受話器から、ノイズ混じりの声がした。\n「……もしもし、{name}です。いま、レジにいます。……そっちは、だれ？」',
      rText:'電話は三十回鳴って、ふっと止んだ。止む直前、店の奥でもうひとつ電話が鳴った気がした。' },
    { display:'非通知',
      aText:'受話器の向こうで、誰かがずっと数を数えていた。\n「……じゅうに、じゅうさん」今夜の客の数と、同じだった。',
      rText:'電話は鳴り止まなかった。受話器を見ないようにしていると、着信表示が一瞬だけ「非通知」から「すぐうしろ」に変わった。' },
  ],
};
const MANAGER = { type:'cust', who:'店の制服を着た男', human:false, chime:true, shadow:true, cam:true, accept:'ついていく', reject:'レジを離れない', scare:'blackout',
  look:{ h:1.0, coat:STORE, pants:'#24282a', skin:'#cdb39c', hair:'short', hairC:'#8d8d88', uniform:true, tag:'店長', stubble:true, feet:'leather', shoes:'#141414', seed:0 },
  desc:'あなたと同じ制服。胸の名札に「店長 田村」。', line:'おつかれ。店長の田村だ。\n……ちょっと倉庫の在庫、一緒に見てくれる？', items:[],
  talk:['本部の帰りだよ。様子を見にね。', '……本部？　ああ、いや、奥からだよ。\nずっと倉庫にいたんだ。'],
  aText:'倉庫の扉をくぐった瞬間、明かりが消えた。背後で、外から鍵がかかる音がした。',
  rText:'「すみません、レジを離れられないので」男は笑顔のまま、しばらく動かなかった。それからバックヤードの扉の奥へ消えた。あの奥に、出口はない。' };
const INTRO = { type:'narr', t:'00:00', who:'午前0時', text:'前の担当から引き継いだのは、店の鍵と、手書きのマニュアル一冊だけ。\n「研修中」の名札を付けて、レジに立つ。' };
const NOTE = { type:'narr', t:'02:59', who:'午前2時59分', red:true, text:'バックヤードで、紙をめくる音がした。\nマニュアルを開くと、ページが一枚増えている。' };
const FAKE_SATO = { type:'cust', t:'06:00', who:'交代の女性', human:false, final:'fake', chime:true, shadow:true, cam:true, accept:'交代する', reject:'まだ交代しない',
  look:{ h:.92, coat:STORE, pants:'#24282a', skin:'#e0c3ad', hair:'pony', hairC:'#2b1f18', uniform:true, bandage:'R', tag:'佐藤', feet:'sneaker', shoes:'#e9e7e0', seed:0 },
  desc:'眠そうな顔の女性。右手に、白い包帯を巻いている。', line:'交代です。……{name}さん、お疲れ様でした。\nもう帰っていいですよ。', items:[],
  talk:['家からです。{name}さんの、おうちの近くから。', '……家？　いいえ、ずっと奥にいましたよ。\nバックヤードに。'],
  aText:'「お疲れ様でした」笑顔に見送られて、店を出た。',
  rText:'「……まだ、いいです」女性はにこにこしたまま後ずさり、自動ドアの向こうの暗がりに溶けた。チャイムは鳴らなかった。' };
const REAL_SATO = { type:'cust', who:'息を切らした女性', human:true, final:'real', chime:true, shadow:true, cam:true, accept:'交代する', reject:'まだ交代しない',
  look:{ h:.92, coat:STORE, pants:'#24282a', skin:'#e3c7b0', hair:'pony', hairC:'#2b1f18', uniform:true, bandage:'L', tag:'佐藤', feet:'sneaker', shoes:'#e9e7e0', seed:2100 },
  desc:'走ってきたらしい。左手に、白い包帯を巻いている。', line:'ごめん、遅れた！　佐藤です、交代するね。\n……昨夜、何もなかった？', items:[],
  talk:['家から！　チャリで飛ばしてきた。', 'え、家からだってば。……大丈夫？　顔色わるいよ。'],
  aText:'「何もなかったです」と答えた。佐藤さんは、少しだけほっとした顔をした。', rText:'「え、なんで？」佐藤さんは困った顔をした。結局、十分後に交代した。' };

// 奇妙だが、中身は人間の客
POOL.human.push(
  { who:'ウサギの被り物の人',
    look:{ h:.95, coat:'#6a4a7a', pants:'#222226', skin:'#e0c4ae', hair:'short', hairC:'#2a2220', mask:'rabbit', feet:'sneaker', shoes:'#d0d0d0', seed:4500 },
    desc:'ウサギの被り物をかぶっている。表情がまったくわからない。', line:'……あ、これ？　罰ゲームで。\nビール六本と、ウコン、ください。', items:['缶ビール ×6','ウコンドリンク'],
    aText:'「どもー」くぐもった声で礼を言って、ウサギは仲間の待つ車へ走っていった。', rText:'「え、無視？　ウサギだから？」被り物の人は、しょんぼりと出ていった。' },
  { who:'ピエロのメイクの男',
    look:{ h:1.0, coat:'#2d5a3a', pants:'#2a2a2a', shirt:'#e8d44a', skin:'#e6c8b0', hair:'messy', hairC:'#c8462e', clown:true, feet:'leather', shoes:'#a02a20', seed:4800 },
    desc:'顔を真っ白に塗っている。口の周りが赤い。', line:'イベント帰りでね、落とすの忘れてた。\n……メイク落としシート、ある？', items:['メイク落としシート'],
    aText:'「助かったよ」男は笑った。メイクの下の口も、ちゃんと笑っていた。', rText:'男は肩をすくめて出ていった。赤く塗った口だけが、ずっと笑っていた。' },
  { who:'人形を抱いた女',
    look:{ h:.93, coat:'#4a3f4c', pants:'#2a2428', skin:'#e0c6b4', hair:'long', hairC:'#1a1414', doll:true, feet:'leather', shoes:'#1a1212', seed:5100 },
    desc:'古い日本人形を、赤ん坊のように抱いている。', line:'この子が、プリン食べたいって言うから。\n……ね？', items:['プリン'],
    aText:'「よかったねえ」女は人形に話しかけながら帰っていった。人形の目が、一瞬こちらを見た気がした。', rText:'女は人形の頭を撫でながら、「こわい人だったね」とささやいて出ていった。' },
  { who:'アルミホイルの帽子の男',
    look:{ h:1.0, coat:'#6a6a5a', pants:'#3a3a32', shirt:'#cfc8b8', skin:'#d4b49a', hair:'messy', hairC:'#4a4640', foil:true, stubble:true, glasses:true, feet:'sneaker', shoes:'#5a5a52', seed:5400 },
    desc:'頭にアルミホイルを巻いている。しきりに天井を気にしている。', line:'あんた、気をつけろよ。今夜この辺、"来てる"から。\n……アルミホイル、あるだけ全部。', items:['アルミホイル ×5'],
    aText:'「信じなくてもいい。でも、空は見るなよ」男はそう言って出ていった。', rText:'「……そうか、あんたも"あっち側"か」男は後ずさりして出ていった。' },
  { who:'警察官',
    look:{ h:1.02, coat:'#1d2a44', pants:'#1d2a44', shirt:'#dfe4ea', skin:'#d2b296', hair:'short', hairC:'#1a1a1a', cap:'police', tie:'#14182a', feet:'leather', shoes:'#0a0a0a', seed:5700 },
    desc:'制服の警察官。無線が小さく鳴っている。', line:'巡回中です。夜中にひとりで大変ですね。\n……缶コーヒー、ホットで。', items:['缶コーヒー（ホット）'],
    aText:'「何かあったら、すぐ110番を」警官は軽く敬礼して出ていった。', rText:'警官は少し怪訝な顔をして、無線で何か話しながら出ていった。' },
  { who:'寝ぼけた男',
    look:{ h:.98, coat:'#8a9ab0', pants:'#8a9ab0', skin:'#dcbfa8', hair:'messy', hairC:'#2a2622', pj:true, buttons:true, sleep:true, sway:true, feet:'sandal', shoes:'#3a3a3a', seed:6000 },
    desc:'パジャマ姿。目が、ずっと閉じている。', line:'……むにゃ……プリン……\n……あと、ゆで卵……', items:['プリン','ゆで卵'],
    aText:'男は目を閉じたまま、器用にお釣りを受け取って帰っていった。寝ぼけていただけらしい。', rText:'男は目を閉じたまま、くるりと向きを変えて出ていった。' },
);
// 宇宙人。カメラに映ると映像が乱れて姿がわからなくなる（ルール3）
POOL.alien = [
  { who:'サングラスの男', alien:true, cam:'glitch',
    look:{ h:1.04, coat:'#55606a', pants:'#3a424a', shirt:'#d8dcd8', tie:'#2a3038', lapel:true, skin:'#b4bfb2', hair:'slick', hairC:'#1a1c1a', shades:true, feet:'leather', shoes:'#111111', seed:0 },
    desc:'夜なのにサングラス。肌の色が、どこか灰色っぽい。', line:'コンバンハ。……デンチ、ヲ、クダサイ。\nタンサン、デンチ、ゼンブ。', items:['単三電池 ×24'],
    aText:'レジ袋を受け取った指は、六本あった。「チキュウノ、デンキ、オイシイ」',
    rText:'目を伏せていると、店内の明かりが一斉に明滅した。顔を上げると、駐車場の上空へ、音もなく光が昇っていくところだった。' },
  { who:'銀色の上着の女', alien:true, cam:'glitch',
    look:{ h:.95, coat:'#9aa2aa', pants:'#5a626a', skin:'#c9cfd2', hair:'bob', hairC:'#c8ccd0', bigEyes:true, feet:'sneaker', shoes:'#e0e4e8', seed:0 },
    desc:'銀色の上着。目が、少しだけ大きすぎる。', line:'このお店は、いつから、ここに、ありますか。\n……わたしたちは、ずっと、上から見ていました。', items:['牛乳 ×6'],
    aText:'「ありがとう。地球の、牛の、白い水」女は牛乳を抱えて出ていった。駐車場の上で、何かが音もなく光った。',
    rText:'目を伏せていると、耳の奥でキーンと高い音が鳴った。顔を上げると、牛乳だけがカウンターに残されていた。' },
];
// 人のふりをした偽物
POOL.fake = [
  { who:'もう一人のあなた', chime:false, accept:'交代する',
    look:{ h:.96, coat:STORE, pants:'#24282a', skin:'#d8bfa8', hair:'short', hairC:'#1a1816', uniform:true, tag:'研修中', stare:true, feet:'sneaker', shoes:'#e9e7e0', seed:0 },
    desc:'あなたと同じ顔。同じ制服。名札には「研修中」。', line:'おつかれさま。……交代しよう。\nわたしのほうが、うまくやれるから。', items:[],
    aText:'レジを譲った瞬間、体がふっと軽くなった。気づくとカウンターの外側に立っていて、もう一人のあなたが接客を始めるのを、ぼんやり眺めていた。',
    rText:'目を伏せていると、自分の声で「……つまんないの」と聞こえた。顔を上げると、窓ガラスに映っているのは、あなた一人だった。' },
  { who:'母親を名乗る女', accept:'一緒に帰る',
    look:{ h:.9, coat:'#6a5a50', pants:'#3a322c', inner:'#e8e0d4', cardigan:true, skin:'#dcc0aa', hair:'bob', hairC:'#2a201a', stare:true, feet:'leather', shoes:'#2a2018', seed:0 },
    desc:'エプロン姿の中年女性。あなたの母親に、よく似ている。', line:'{name}、迎えに来たよ。\n……ほら、帰ろう。お店なんか、もういいから。', items:[],
    aText:'差し出された手を取った。母の手は、こんなに細長かっただろうか。自動ドアは、開かなかった。',
    rText:'名札には「研修中」としか書いていない。顔を上げると、誰もいなかった。……あとで実家に電話すると、母はずっと寝ていたと言った。' },
  { who:'警察官', shadow:false, accept:'奥へ通す',
    look:{ h:1.02, coat:'#1d2a44', pants:'#1d2a44', shirt:'#dfe4ea', skin:'#d2b296', hair:'short', hairC:'#1a1a1a', cap:'police', tie:'#14182a', stare:true, feet:'leather', shoes:'#0a0a0a', seed:0 },
    desc:'制服の警察官。無線は、まったく鳴っていない。', line:'巡回中です。この店で、何か変わったことは？\n……念のため、奥を確認させてもらえますか。', items:[],
    talk:['駅前の交番からです。', '……交番？　いえ、本署から。\n……どちらでも、同じでしょう。'],
    aText:'バックヤードの扉を開けた警官は、振り返って笑った。「いい店ですね。住みやすそうだ」',
    rText:'目を伏せていると、無線のノイズのような声で「……また来ます」と聞こえた。足音は、しなかった。' },
];
// 見た目はいかにも幽霊だが、ルールはすべて満たしている人間。追い返すと苦情になる
POOL.seemGhost = [
  { who:'白い着物の女',
    look:{ h:.94, coat:'#e9e6e0', pants:'#e9e6e0', legs:'#e4d6cc', skirtLen:.85, skin:'#e8dcd4', hair:'long', hairC:'#0b0b0c', faceHidden:true, pale:true, feet:'sandal', shoes:'#d8cfc4', seed:6300 },
    desc:'白い着物。長い髪で、顔がほとんど隠れている。', lines:['……ろうそく……ください……', '……おそなえ……の……おはぎ……を……'], items:['ろうそく','おはぎ'],
    talk:['……あっ、すみません！　肝試しのお化け役で、裏の墓地から……\nつい、役のまま入っちゃって。', 'だから、裏の墓地ですって。サークルの合宿で。\n……メイク、そんなに怖いですか？'],
    react:{ feet:'……あの、裾、踏んでます？\nこれ、レンタルなんで……', face:'（髪の隙間から、泣きぼくろのある目がぱちぱちと瞬いた）' },
    aText:'「よかったあ、ろうそく切れてて」女は髪をかき上げた。下から出てきたのは、汗だくの大学生の顔だった。',
    rText:'女は長い髪をかき上げた。下から出てきたのは、泣きそうな大学生の顔だった。「……お化け役、やりすぎたかな」\nあれは、人間だった。' },
  { who:'ずぶ濡れの男',
    look:{ h:1.0, coat:'#3a4248', pants:'#2a3036', shirt:'#c8ccc8', skin:'#bfc6c4', hair:'messy', hairC:'#141414', wet:true, pale:true, stubble:true, feet:'leather', shoes:'#1a1a1a', seed:6600 },
    desc:'全身ずぶ濡れ。唇が紫色だ。外は、雨なんて降っていない。', lines:['……タオル……ありますか……', '……さむい……あったかい、ものを……'], items:['フェイスタオル','缶コーヒー（ホット）'],
    talk:['……川です。酔って、橋から落ちて……\n自分で、泳いで上がってきました……', 'だから、川ですって……　へっくし！\n……財布だけは、無事でした。'],
    react:{ feet:'（男の足元には水たまりができていて、その上で、震える影が揺れていた）', face:'……そんなに見ないでください。\n顔、真っ青でしょう……' },
    aText:'男はタオルを頭からかぶって、何度も礼を言った。床の水たまりには、ちゃんと男の影が映っていた。',
    rText:'男は震えながら出ていった。翌朝のニュースで「橋から転落の男性、自力で岸へ」と流れていた。\nあれは、人間だった。' },
  { who:'血まみれのエプロンの男',
    look:{ h:1.04, coat:'#3a3a3a', pants:'#26262a', apron:'#e6e3dc', blood:true, skin:'#c9a184', hair:'short', hairC:'#1a1a1a', stubble:true, feet:'boots', shoes:'#1a1a1a', seed:6900 },
    desc:'白いエプロンに、赤黒い染みがべったり付いている。', lines:['……一番大きいゴミ袋と、漂白剤。\n……急いでるんだ。', '……ゴミ袋を、ありったけ。\n……あと、ゴム手袋も。'], items:['ゴミ袋（45L）','漂白剤','ゴム手袋'],
    talk:['そこの焼肉屋だよ。仕込みがやっと終わってな。', '焼肉屋だって。……ああ、このエプロンか。\nハツとレバーだよ。食うかい？'],
    react:{ feet:'……長靴、汚れてるだろ。床、汚してたら悪いな。' },
    aText:'「明日の夜、店に来なよ。タン一皿サービスする」男はゴミ袋を担いで出ていった。',
    rText:'「……なんだよ、感じ悪いな」男は舌打ちして出ていった。翌日、通りの焼肉屋の看板で、同じ顔の店主が笑っていた。\nあれは、人間だった。' },
  { who:'瞬きをしない女',
    look:{ h:.93, coat:'#2a2a30', pants:'#1e1e24', inner:'#d8d4cc', cardigan:true, skin:'#e4cfc2', hair:'long', hairC:'#141012', stare:true, iris:'#6a7a8a', feet:'leather', shoes:'#141414', seed:7200 },
    desc:'じっとこちらを見ている。瞬きを、ほとんどしない。瞳の色が、少し薄い。', lines:['……目薬。一番、強いやつ。', '……目薬、ありますか。\n……ずっと、目が、閉じられなくて。'], items:['目薬（クール）'],
    talk:['……家から。カラコン入れたまま寝ちゃって、\n目がカピカピで。', 'だから家からですってば。……あ、いま瞬きしたの、見ました？\n痛いんですよ、これ。'],
    react:{ face:'（よく見ると、彼女はときどき、痛そうに瞬きをしている）' },
    aText:'女はその場で目薬をさして、「生き返ったあ」と笑った。目が真っ赤だった。',
    rText:'女は涙目のまま、目をこすりながら出ていった。\nあれは、人間だった。' },
];
// 見た目も話し方も普通の人。ルールのどれか一つだけを、何も言わずに破っている
POOL.stealth = [
  { who:'塾帰りの高校生', shadow:false,
    look:{ h:.97, coat:'#2a3550', pants:'#22283a', shirt:'#e4e6e8', skin:'#e2c6b0', hair:'short', hairC:'#141414', glasses:true, feet:'sneaker', shoes:'#e0e0dc', seed:7500 },
    desc:'リュックを背負った高校生。単語帳を片手に持っている。', lines:['肉まんと、エナジードリンクください。\n……あ、温めなくていいです。', 'これ、お願いします。\n……明日、模試なんです。'], items:['肉まん','エナジードリンク'],
    talk:['駅前の塾からです。自習室が閉まるまでいて。', '……塾？\nああ、そうでした。塾の帰りでした。……ずっと、帰る途中なんです。'],
    react:{ feet:'……下、見ないでもらえます？' },
    aText:'レシートを受け取ると、少年はほっとしたように笑った。「これで、やっと帰れる」\n——床には、少年の分の影がなかった。',
    rText:'目を伏せていると、単語帳をめくる音だけが残った。顔を上げると、カウンターに十年前の日付の模試の答案が一枚、置かれていた。' },
  { who:'常連のおじいさん', cam:false, scare:'cam',
    look:{ h:.88, coat:'#6a6458', pants:'#3a3832', inner:'#d0cabc', cardigan:true, buttons:true, skin:'#d4b8a2', hair:'short', hairC:'#c4c4c0', old:true, stoop:true, feet:'sandal', shoes:'#3a3a3a', seed:7800 },
    desc:'人のよさそうなおじいさん。慣れた様子で、たばこの棚を指さす。', lines:['いつものね。三十二番のやつ。', 'やあ、新しい子かい。\nいつもの、三十二番ちょうだい。'], items:['たばこ（32番）'],
    talk:['すぐそこの団地だよ。毎晩、この時間に来てるんだ。', '団地……？\nいや、病院だったかな。白い部屋でね。ずいぶん長く、寝てたんだ。'],
    react:{ cam:'……カメラかい。\n最近は、映りが悪くてねえ。' },
    aText:'たばこを渡すと、おじいさんは嬉しそうに目を細めた。「やっと、いつものが買えた」\nあとで引き継ぎノートを見ると「32番の常連さん、先月亡くなりました」と書いてあった。',
    rText:'目を伏せていると「……そうか、もう売ってくれんのか」と寂しそうな声がした。顔を上げると、たばこの棚の32番だけが、ひとつ減っていた。' },
  { who:'終電を逃した女性', chime:false, walk:true, // ドアは開くが、チャイムが鳴らない
    look:{ h:.93, coat:'#7a6a58', pants:'#2a2a30', legs:'#d8c0ac', skirtLen:.45, inner:'#e8e4dc', lapel:true, skin:'#e2c6b2', hair:'bob', hairC:'#3a2a20', feet:'leather', shoes:'#2a1a12', seed:8100 },
    desc:'ベージュのコート。スマホを見ながら入ってきた。', lines:['すみません、スマホの充電器ありますか？\nタイプCの。', 'モバイルバッテリーって、どこですか？\n……スマホ、電池切れちゃって。'], items:['モバイルバッテリー'],
    talk:['会社からです。終電、逃しちゃって。', '……会社？\nいいえ、駅のホームからです。ずっと、来ない電車を待ってて。'],
    aText:'「助かりました」女性は自動ドアへ向かった。ドアが開いても、チャイムは鳴らなかった。……入ってきたときも、鳴っていなかった。',
    rText:'目を伏せていると「……次の電車、まだかな」とつぶやく声が、ゆっくり遠ざかっていった。' },
  { who:'ジョギング中の女', shadow:false,
    look:{ h:.95, coat:'#3a5a7a', pants:'#1e2228', skin:'#e0c0a8', hair:'pony', hairC:'#2a1e16', feet:'sneaker', shoes:'#f0f0ea', seed:8400 },
    desc:'ランニングウェアの女性。息が、少しも上がっていない。', lines:['スポーツドリンク、ひとつ。\n……毎晩、このあたりを走ってるんです。', 'お水ください。冷たいの。\n……今夜も、走らなきゃ。'], items:['スポーツドリンク'],
    talk:['川沿いを走ってきました。夜のほうが、涼しくて。', '川沿い……？\nああ、橋の上から……いえ、走ってたんです。たぶん、ずっと。'],
    react:{ feet:'……走ってると、ときどき置いてきちゃうんです。\n影を。' },
    aText:'ペットボトルを受け取った手が、ひどく冷たかった。「また明日も来ますね。明日も、その次も」\n床を見ると、女の足元に影はなかった。',
    rText:'目を伏せていると、足音がしないまま、気配が遠ざかっていった。外を見ても、走っていく人影はどこにもなかった。' },
];
// 「どちらから？」と二回聞いたときの答え。人間は同じことを言い、人でないものは答えが変わる（酔っぱらいと寝ぼけた人は別）
const ASK = ['こんな時間に、どちらから？', '……すみません、さっき、どちらからって？'];
const TALK = {
  '会社員風の男':['会社です。この時間まで、ずっと会議で……', '会社ですよ。……え、二回目ですよね、それ。'],
  '大学生くらいの女性':['友達の家から。レポート終わんなくて。', 'え？　だから友達の家。すぐそこのマンション。'],
  '酔った中年男':['飲み屋からぁ！　三軒目！', 'えー？　会社……いや、飲み屋か？\nわははは、どこだっけなあ！'],
  '小柄な老婆':['すぐそこの、坂の上の家からよ。', '坂の上よ。……ふふ、年寄りだと思って、試してる？'],
  'パジャマの男の子':['……おうち。あの、青い屋根の。', 'あおい、やねの、おうち……\nおかあさん、まってるの。'],
  '作業着の男':['寮からだよ。これから現場。', '寮だって。……あんた、眠そうだな。大丈夫か？'],
  '夜勤明けの看護師':['病院からです。夜勤明けで。', '病院ですよ。……ふふ、お互い、頭まわってないね。'],
  '喪服の男':['……斎場からです。父が、夕方に。', '斎場です。……すみません、いまは、あまり話す気分じゃなくて。'],
  '黒ずくめの女性':['ライブハウス。終わって、そのまま。', 'だからライブハウス。……耳、まだキーンってしてる。'],
  '釣り帰りの男':['港だよ。夜釣りの帰り。', '港だって。……あ、生臭いか？　悪いね。'],
  '配送ドライバー':['営業所からです。これから最後の配達で。', '営業所ですって。……すみません、急いでて。'],
  '手を痛めた男':['ジムです。バーベル、落としちゃって。', 'ジムですよ。……カッコ悪いんで、あんまり聞かないで。'],
  'ウサギの被り物の人':['飲み会。罰ゲームで、これ被ったまま買い出し。', 'だから飲み会だって！　……ウサギに二回聞く？'],
  'ピエロのメイクの男':['ハロウィンのイベント帰り。', 'イベントだよ。……ピエロだって、家には帰るさ。'],
  '人形を抱いた女':['お家から。この子が、起きちゃって。', 'お家からよ。……ね、この子も、そう言ってる。'],
  'アルミホイルの帽子の男':['観測所だ。……と言っても、うちの屋上だが。', 'うちの屋上だ。……二回聞くってことは、あんたも疑ってるな？'],
  '警察官':['駅前の交番からです。巡回で。', '交番ですよ。……何か、気になることでも？'],
  '寝ぼけた男':['……むにゃ……うみ……', '……やま……\n（さっきと答えが違う。……完全に寝ている）'],
  'ずぶ濡れの女':['……みずの、そこ……', '……ここ。\nここも、もうすぐ、みずのそこ。'],
  '傘をついた老人':['……駅から。最終の、汽車で。', '……汽車？　はて、わしは、どこから来たんだったか……'],
  '黒いスーツの男':['本社から参りました。', '……本社？　いえ、地下から参りました。\n……失礼、言い間違えました。'],
  '白いワンピースの少女':['……おうち。', '……おうち、なくなっちゃった。\nだから、ここに、すむの。'],
  '笑顔の男':['ふふ、どこからだと思います？', 'さっき？　ずっと、ここにいましたよ。\nあなたの、すぐ後ろに。'],
  '丁寧な口調の女':['二丁目の、赤い屋根のお宅から。', '……三丁目、でしたかしら。\nどこでもいいでしょう？　ルールは、読んだのでしょう？'],
  'パーカーの青年':['駅のほうから。', '……駅？\n言ってませんよ、そんなこと。'],
  '仕事帰りの女性':['会社から。今日も残業で。', '……会社？\nああ、そうだった。わたし、会社から帰る途中だった。……いつから？'],
  '制服の女子高生':['{name}さんの、おうちの前から。', 'ずっと前から。……ね、{name}さん。'],
  '近所のおばさん':['お向かいよ。{name}ちゃんちの。', 'あら、言ったじゃない。お向かいよ。\n……あなたの部屋の窓、よく見えるの。'],
  'サングラスの男':['……ウエ、カラ。', 'ウエ……チガウ。トウキョウ、カラ。\nチキュウジン、デス。'],
  '銀色の上着の女':['……遠い、ところ、から。', '……遠く、ない。\nあなたたちの、真上、から。'],
  'もう一人のあなた':['あなたの家から。……わたしの家、でもあるけど。', 'さっき？　あなたが来たのと、同じ道から。'],
  '母親を名乗る女':['家からよ。決まってるでしょう。', '家よ。……あなたの、新しい家。ここの、奥の。'],
};
const TALK_HUMAN = ['近所です。眠れなくて。', 'だから近所ですって。……なにか？'];
const TALK_GHOST = ['……どちら、から。\n（あなたの言葉を、そのまま繰り返した）', '……さっき？\nさっきって、いつのこと？'];
// 顔・足元・カメラを見られたときの反応
const REACT_HUMAN = { feet:['……え、足元に何か落ちてます？', '（客は自分の靴を見下ろして、首をかしげた）'], face:['……あの、顔に何か付いてます？', '（目が合うと、気まずそうにそらされた）'], cam:['（客もつられて、モニターのほうを見上げた）'] };
const REACT_GHOST = { feet:['……いま、下、見ました？', '……足元は、見ないで。'], face:['……目、そらさないんですね。', '（目が合った。向こうは、一度も瞬きをしない）'], cam:['……カメラ、見てたでしょう。', '（モニターから目を戻すと、客はさっきより少し近くに立っていた）'] };

// ドアの外に来る動物。本物には影があり、瞬きをして、尻尾が動く
POOL.animal = [
  { type:'animal', animal:'cat', fake:false, who:'黒猫', accept:'店に入れる', reject:'放っておく',
    desc:'自動ドアの外で、黒猫が前足でガラスをかいている。', line:'にゃあ。',
    aText:'ドアを開けると、猫はするりと入ってきて、雑誌棚の前で丸くなった。……少しだけ、心強い。', rText:'猫はしばらくこちらを見ていたが、やがて闇の中へ歩いていった。' },
  { type:'animal', animal:'cat', fake:true, who:'黒猫', accept:'店に入れる', reject:'放っておく',
    desc:'自動ドアの外に、黒猫が座っている。瞬きもせず、じっとこちらを見ている。', line:'……にゃあ。\n（口が、動いていない）',
    aText:'ドアを開けた瞬間、猫は後ろ足で立ち上がった。「いれてくれて、ありがとう」人の声だった。', rText:'放っておくと、猫はゆっくり立ち上がり、二本足で駐車場を歩いていった。' },
  { type:'animal', animal:'dog', fake:false, who:'迷い犬', accept:'店に入れる', reject:'放っておく',
    desc:'首輪をした茶色い犬が、ドアの外で尻尾を振っている。', line:'ワン！',
    aText:'犬は嬉しそうに入ってきて、雑誌棚の前に伏せた。時々こちらを見て、尻尾を振る。', rText:'犬はさみしそうに鼻を鳴らして、どこかへ走っていった。' },
  { type:'animal', animal:'dog', fake:true, who:'迷い犬', accept:'店に入れる', reject:'放っておく',
    desc:'茶色い犬が、ドアの外に座っている。尻尾が、一度も動かない。', line:'…………。\n（吠えもしない）',
    aText:'ドアが開くと、犬は四つ足のまま、天井に届くほど背を伸ばした。', rText:'目をそらすと、ドアの外から「……ワン」と、男の声がした。' },
];

// 毎晩、名簿から顔ぶれと順番を組み直す。3時の赤いルールの直後には必ず影のない客が来る
function buildNight(){
  const r = Math.random, pick = a => a[Math.floor(r() * a.length)];
  const shuffle = a => a.map(v => [r(), v]).sort((x, y) => x[0] - y[0]).map(v => v[1]);
  const cust = (e, human) => { // セリフが複数あるときは、毎晩どれか一つを言う
    const c = { type:'cust', human, chime:true, shadow:true, cam:true, ...e };
    if (e.lines) c.line = pick(e.lines);
    return c;
  };
  const phone = (e, caller) => ({ type:'phone', caller, ...e });
  // さっき来た客の偽物。見た目は同じで、チャイム・影・カメラのどれかがおかしい
  const twin = h => {
    const fail = pick(['chime', 'shadow', 'cam']);
    return { ...cust(h, false), [fail]: false, scare: fail === 'cam' ? 'cam' : undefined, who: 'さっきの' + h.who, look: { ...h.look, stare: true, seed: 0 },
      desc: 'さっき来た客だ。……服も、顔も、まったく同じ。', line: '……さっき、ここに来ませんでしたか。\nわたしに、そっくりなひとが。',
      talk: [(TALK[h.who] || TALK_HUMAN)[0], 'わたし、どこからって言いました？\n……思い出せないんです。さっきのわたしが、どこから来たのか。'],
      aText: '会計を済ませると、それは嬉しそうに言った。「よかった。これで、本物はいらない」',
      rText: '目を伏せてやり過ごした。……最初に来たほうが本物だったのか、急にわからなくなった。' };
  };
  const humans = shuffle(POOL.human), early = humans.filter(h => !h.late).slice(0, 3);
  const late = humans.filter(h => !early.includes(h)).slice(0, 2);
  const seem = shuffle(POOL.seemGhost), sneak = shuffle(POOL.stealth);
  const kind = r() < .5 ? 'cat' : 'dog', fakeAnimal = r() < .35;
  const animal = POOL.animal.find(a => a.animal === kind && a.fake === fakeAnimal);
  const before = [...early.slice(0, 2).map(h => cust(h, true)),
    ...shuffle([...early.slice(2).map(h => cust(h, true)), cust(seem[0], true), cust(sneak[0], false), cust(pick(POOL.noChime), false), cust(pick(POOL.noShadow), false),
      phone(pick(POOL.honbu), 'honbu'), ...(r() < .8 ? [{ ...animal }] : [])])];
  const after = shuffle([...late.map(h => cust(h, true)), cust(seem[1], true), cust(sneak[1], false), cust(pick(POOL.noCam), false), cust(pick(POOL.nameCall), false),
    phone(pick(POOL.unknown), 'unknown'), cust(pick(POOL.fake), false),
    ...(r() < .7 ? [cust(pick(POOL.alien), false)] : []), ...(r() < .6 ? [twin(pick(early))] : []), ...(r() < .7 ? [MANAGER] : [])]);
  after.splice(Math.floor(r() * 2), 0, cust(pick(POOL.trap), false));
  const at = (list, from, to) => list.map((e, i) => {
    const m = Math.round(from + (to - from) * (i + .5) / list.length + (r() - .5) * 6);
    return { ...e, t: `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}` };
  });
  const finale = r() < .5 ? [FAKE_SATO, { ...REAL_SATO, t:'06:04' }] : [{ ...REAL_SATO, t:'06:00' }];
  return [INTRO, ...at(before, 8, 172), NOTE, ...at(after, 182, 352), ...finale];
}
let NIGHT = buildNight();


const ENDINGS = {
  true:   { kind:'TRUE END', title:'次の人へ', text:'佐藤さんにレジを任せ、バックヤードでエプロンを外した。\nロッカーの上に、あのマニュアルが置いてある。最後のページをめくると、見覚えのある筆跡で一行だけ書き足されていた。\n\n「次の人へ。ルールを守れば大丈夫。——{name}」\n\nあなたはまだ、何も書いていない。' },
  survive:{ kind:'NORMAL END', title:'朝の帰り道', text:'朝の光の中を歩いて帰った。\n足元を見る。影は、ちゃんとある。\n……少しだけ、薄い気がするけれど。' },
  erosion:{ kind:'BAD END', title:'影のない客', text:'ふと気づくと、レジの外側に立っていた。\nカウンターの向こうで、新しい研修生がマニュアルをめくっている。\nあなたは商品を持たずに、レジへ歩いていく。\n床を見る。影は、もう無い。' },
  fired:  { kind:'BAD END', title:'解雇通知', text:'「お客様から苦情が三件。悪いけど、今日で終わりにしよう」\n受話器の向こうで、店長はそう言った。\n……その声は、なぜか真後ろから聞こえた。' },
  swap:   { kind:'BAD END', title:'交代', text:'自動ドアをくぐる。チャイムは鳴らなかった。\n朝日の中で振り返ると、ガラス越しにレジが見えた。\nそこに立って、こちらに手を振っているのは——{name}だった。' },
};

/* ---------- 状態 ---------- */
const S = {
  name:'ミナミ', idx:-1, shadow:3, comp:0, right:0, total:0, phase:'title', ev:null, cur:null,
  pose:{ p:0, a:0 }, anim:null, door:0, doorT:0, peek:null, cut:null, view:null, lastView:'feet', closeK:0, dark:null, aisle:null, flash:null, camGhost:0, omenNext:0, omenArmed:false, flashes:0, counterT0:0, pet:null, petHiss:0, animalAt:false, ufo:null, crow:null, moths:null, rat:null, timer:null, talkN:0, reacted:{}, lineSeq:0, log:[],
  ringing:false, nextRing:0, phoneDisplay:'', red:false, light:1, toast:null, scare:null, pendingEnd:null, lastThump:0,
};
const fmt = s => (s || '').split('{name}').join(S.name);

/* ---------- 音 ---------- */
const A = { c:null, m:null, muted:false };
function audioInit(){
  if (A.c){ if (A.c.state === 'suspended') A.c.resume(); return; }
  try {
    const c = A.c = new (window.AudioContext || window.webkitAudioContext)();
    A.m = c.createGain(); A.m.gain.value = A.muted ? 0 : .9; A.m.connect(c.destination);
    const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 50;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 160;
    const g = c.createGain(); g.gain.value = .05;
    o.connect(f); f.connect(g); g.connect(A.m); o.start(); A.hum = g;
    const len = c.sampleRate * 1.5, b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    A.noise = b;
  } catch (e) { A.c = null; }
}
function tone(f, t, dur, type, vol, slideTo){
  const c = A.c; if (!c) return;
  const o = c.createOscillator(); o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  const g = c.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .015); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(g); g.connect(A.m); o.start(t); o.stop(t + dur + .05);
}
function noise(t, dur, vol, freq, q){
  const c = A.c; if (!c) return;
  const s = c.createBufferSource(); s.buffer = A.noise;
  const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q || 1;
  const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(A.m); s.start(t); s.stop(t + dur);
}
const at = () => A.c ? A.c.currentTime : 0;
function sChime(){ if (!A.c) return; const t = at(); tone(784, t, 1.1, 'sine', .16); tone(1568, t, .5, 'sine', .03); tone(622, t + .42, 1.5, 'sine', .16); tone(1244, t + .42, .6, 'sine', .03); }
function sRing(){ if (!A.c) return; const t = at(); for (let i = 0; i < 2; i++){ const s = t + i * .45; tone(440, s, .38, 'square', .03); tone(480, s, .38, 'square', .03); } }
function sThump(){ if (!A.c) return; const t = at(); tone(70, t, .18, 'sine', .35, 40); tone(60, t + .16, .2, 'sine', .25, 35); }
function sScare(){ if (!A.c) return; const t = at(); noise(t, 1, .5, 900, .6); tone(220, t, 1, 'sawtooth', .16, 55); tone(233, t, 1, 'sawtooth', .13, 58); tone(1800, t, .6, 'square', .04, 1200); }
function sPaper(){ if (!A.c) return; const t = at(); noise(t, .25, .12, 3000, .8); noise(t + .3, .2, .1, 2600, .8); }
function sClick(){ if (!A.c) return; const t = at(); tone(1200, t, .05, 'square', .03); noise(t, .08, .05, 5000, 1); }

/* ---------- 下ごしらえ（背景・ノイズ・周辺減光） ---------- */
const PRODUCT = ['#7a3b34','#a08a3c','#3f5f7a','#6b7a3c','#8a5a7a','#b0a89a','#4b6b5c','#9a5a2c','#5d6e8a'];
const BG = mk(W, H);
(function(){
  const g = BG.getContext('2d'), r = rng(7);
  g.fillStyle = '#151b19'; g.fillRect(0, 0, W, 122);
  g.fillStyle = '#2b3531'; g.fillRect(0, 122, W, 213);
  g.fillStyle = '#202826'; g.fillRect(0, 122, W, 6);
  const fg = g.createLinearGradient(0, 335, 0, H); fg.addColorStop(0, '#47524d'); fg.addColorStop(1, '#1b2220');
  g.fillStyle = fg; g.fillRect(0, 335, W, H - 335);
  g.strokeStyle = 'rgba(0,0,0,.22)'; g.lineWidth = 1;
  for (let i = -16; i <= 16; i++){ g.beginPath(); g.moveTo(480 + i * 34, 335); g.lineTo(480 + i * 120, H); g.stroke(); }
  for (let k = 1; k < 9; k++){ const y = 335 + (H - 335) * Math.pow(k / 9, 1.7); g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  const rg = g.createRadialGradient(480, 360, 10, 480, 360, 300); rg.addColorStop(0, 'rgba(230,250,240,.12)'); rg.addColorStop(1, 'rgba(230,250,240,0)');
  g.fillStyle = rg; g.fillRect(0, 335, W, H - 335);
  // 左：菓子の棚
  const sx = 22, sy = 150, sw = 350, sh = 185;
  g.fillStyle = '#1c2321'; g.fillRect(sx, sy, sw, sh);
  for (let i = 0; i < 4; i++){
    const ry = sy + 8 + i * (sh - 12) / 4, rh = (sh - 12) / 4;
    let px = sx + 5;
    while (px < sx + sw - 14){
      const pw = 10 + r() * 18, ph = rh * (.45 + r() * .4);
      g.fillStyle = PRODUCT[Math.floor(r() * PRODUCT.length)]; g.globalAlpha = .55 + r() * .3;
      g.fillRect(px, ry + rh - 5 - ph, pw - 2, ph); px += pw;
    }
    g.globalAlpha = 1; g.fillStyle = '#3d4844'; g.fillRect(sx, ry + rh - 5, sw, 5);
  }
  // 右：冷蔵ケース
  const fx = 590, fy = 140, fw = 346, fh = 195;
  g.fillStyle = '#121615'; g.fillRect(fx, fy, fw, fh);
  for (let d = 0; d < 4; d++){
    const dx = fx + 8 + d * (fw - 16) / 4, dw = (fw - 16) / 4 - 6;
    const lg = g.createLinearGradient(0, fy, 0, fy + fh); lg.addColorStop(0, '#cfe6e2'); lg.addColorStop(1, '#7f9c98');
    g.fillStyle = lg; g.globalAlpha = .28; g.fillRect(dx, fy + 8, dw, fh - 16); g.globalAlpha = 1;
    for (let i = 0; i < 4; i++){
      const ry = fy + 12 + i * (fh - 24) / 4, rh = (fh - 24) / 4;
      for (let bx = dx + 3; bx < dx + dw - 8; bx += 9){
        g.fillStyle = PRODUCT[Math.floor(r() * PRODUCT.length)]; g.globalAlpha = .7;
        g.fillRect(bx, ry + rh * .25, 6, rh * .7);
      }
      g.globalAlpha = 1; g.fillStyle = 'rgba(200,220,215,.35)'; g.fillRect(dx, ry + rh - 2, dw, 2);
    }
    g.fillStyle = '#2b3331'; g.fillRect(dx + dw, fy, 6, fh);
  }
  // 入口の上の表示
  g.fillStyle = '#0f1312'; g.fillRect(420, 126, 120, 14);
  g.fillStyle = STORE; g.font = '11px "DotGothic16", monospace'; g.textAlign = 'center'; g.fillText('OPEN 24H', 480, 137);
})();
const NOISE = [0, 1, 2, 3].map(() => {
  const c = mk(160, 94), g = c.getContext('2d'), im = g.createImageData(160, 94);
  for (let i = 0; i < im.data.length; i += 4){ const v = Math.random() * 255; im.data[i] = v * .85; im.data[i + 1] = v; im.data[i + 2] = v * .9; im.data[i + 3] = 255; }
  g.putImageData(im, 0, 0); return c;
});
const VIG = mk(W, H);
(function(){ const g = VIG.getContext('2d'), rg = g.createRadialGradient(480, 280, 180, 480, 280, 620); rg.addColorStop(0, 'rgba(0,0,0,0)'); rg.addColorStop(1, 'rgba(0,0,0,.78)'); g.fillStyle = rg; g.fillRect(0, 0, W, H); })();

/* ---------- 描画 ---------- */
function drawDoor(g, open){
  const x = 406, y = 146, w = 148, h = 189;
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  const og = g.createLinearGradient(0, y, 0, y + h); og.addColorStop(0, '#010203'); og.addColorStop(1, '#0a0f0e');
  g.fillStyle = og; g.fillRect(x, y, w, h);
  const sg = g.createRadialGradient(x + w * .8, y + 40, 1, x + w * .8, y + 40, 26); sg.addColorStop(0, 'rgba(230,205,140,.55)'); sg.addColorStop(1, 'rgba(230,205,140,0)');
  g.fillStyle = sg; g.fillRect(x, y, w, 90);
  g.fillStyle = 'rgba(200,200,190,.12)'; g.fillRect(x + 10, y + h - 30, 40, 3); g.fillRect(x + 90, y + h - 30, 40, 3);
  const pw = w / 2, off = open * pw * .94;
  g.fillStyle = 'rgba(170,200,190,.07)'; g.strokeStyle = '#7f8b86'; g.lineWidth = 3;
  g.fillRect(x - off, y, pw, h); g.strokeRect(x - off + 1.5, y + 1.5, pw - 3, h - 3);
  g.fillRect(x + pw + off, y, pw, h); g.strokeRect(x + pw + off + 1.5, y + 1.5, pw - 3, h - 3);
  g.fillStyle = 'rgba(255,255,255,.05)';
  g.beginPath(); g.moveTo(x - off + 14, y); g.lineTo(x - off + 30, y); g.lineTo(x - off + 6, y + h); g.lineTo(x - off - 10, y + h); g.fill();
  g.restore();
  g.strokeStyle = '#9aa6a1'; g.lineWidth = 6; g.strokeRect(x - 3, y - 3, w + 6, h + 3);
}
function drawLights(g){
  const L = S.light;
  [[170, 26, 620, 10], [250, 58, 460, 8], [310, 86, 340, 6]].forEach(([x, y, w, h]) => {
    g.fillStyle = `rgba(220,255,240,${.07 * L})`; g.fillRect(x - 20, y - 10, w + 40, h + 20);
    g.fillStyle = `rgba(${Math.round(150 + 90 * L)},${Math.round(160 + 92 * L)},${Math.round(155 + 90 * L)},1)`; g.fillRect(x, y, w, h);
  });
}
/* ---------- 人物 ---------- */
const hexRGB = h => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
function shade(h, k){ let [r, g, b] = hexRGB(h); if (k < 0){ r *= 1 + k; g *= 1 + k; b *= 1 + k; } else { r += (255 - r) * k; g += (255 - g) * k; b += (255 - b) * k; } return `rgb(${r | 0},${g | 0},${b | 0})`; }
function mix(a, b, k){ const A = hexRGB(a), B = hexRGB(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join(''); }
function hashStr(s){ let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; }
function softEll(g, x, y, rx, ry, rgb, a){ // 縁がぼやけた楕円の影
  g.save(); g.translate(x, y); g.scale(rx, ry);
  const sg = g.createRadialGradient(0, 0, 0, 0, 0, 1); sg.addColorStop(0, `rgba(${rgb},${a})`); sg.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = sg; g.beginPath(); g.arc(0, 0, 1, 0, Math.PI * 2); g.fill(); g.restore();
}
function hGrad(g, x0, x1, col, dl, dr){ const lg = g.createLinearGradient(x0, 0, x1, 0); lg.addColorStop(0, shade(col, dl)); lg.addColorStop(.45, shade(col, .06)); lg.addColorStop(1, shade(col, dr)); return lg; }
function limb(g, x1, y1, x2, y2, w1, w2){
  const dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
  g.beginPath(); g.moveTo(x1 + nx * w1, y1 + ny * w1); g.lineTo(x2 + nx * w2, y2 + ny * w2); g.lineTo(x2 - nx * w2, y2 - ny * w2); g.lineTo(x1 - nx * w1, y1 - ny * w1); g.closePath();
}
function lock(g, G, xt0, xt1, xb0, xb1, yt, yb){
  const { hx, fw } = G, m1 = yt + (yb - yt) * .4, m2 = yt + (yb - yt) * .6;
  g.beginPath(); g.moveTo(hx + fw * xt0, yt); g.lineTo(hx + fw * xt1, yt);
  g.bezierCurveTo(hx + fw * xt1, m1, hx + fw * xb1, m2, hx + fw * xb1, yb); g.lineTo(hx + fw * xb0, yb);
  g.bezierCurveTo(hx + fw * xb0, m2, hx + fw * xt0, m1, hx + fw * xt0, yt); g.closePath();
}

// 人間は呼吸し、視線が動く。人でないものは止まっている
function personGeo(L, cx, footY, s, now, alive){
  const Hh = 400 * (L.h || 1) * s, top = footY - Hh;
  const hr = Hh * .066 * (L.hs || 1), fw = hr * (L.kid ? .84 : .76);
  const t = now / 1000 + (L.seed || 0) / 300;
  const breath = alive ? Math.sin(t * 1.6) * hr * .05 : 0, drift = alive ? Math.sin(t * .7) * hr * .06 : 0;
  const hx = cx + (L.stoop ? hr * .3 : 0) + drift, hy = top + hr * 1.05 + (L.stoop ? hr * .4 : 0);
  return { Hh, top, hr, fw, hx, hy, cx, footY, t, shY: top + hr * 2.85 - breath, sw: Hh * .13 * (L.kid ? 1.08 : 1), hipY: top + Hh * .55 };
}
function facePath(g, G, L){
  const { hx, hy, hr, fw } = G, k = L.kid ? 1 : 0;
  g.beginPath(); g.moveTo(hx, hy - hr * 1.02);
  g.bezierCurveTo(hx + fw * .78, hy - hr * 1.02, hx + fw * 1.02, hy - hr * .45, hx + fw * .98, hy);
  g.bezierCurveTo(hx + fw * .96, hy + hr * (.45 + k * .1), hx + fw * (.62 + k * .15), hy + hr * .82, hx + fw * .3, hy + hr * .96);
  g.quadraticCurveTo(hx, hy + hr * 1.04, hx - fw * .3, hy + hr * .96);
  g.bezierCurveTo(hx - fw * (.62 + k * .15), hy + hr * .82, hx - fw * .96, hy + hr * (.45 + k * .1), hx - fw * .98, hy);
  g.bezierCurveTo(hx - fw * 1.02, hy - hr * .45, hx - fw * .78, hy - hr * 1.02, hx, hy - hr * 1.02);
  g.closePath();
}
function capPath(g, G, hl){
  const { hx, hy, hr, fw } = G;
  g.beginPath(); g.moveTo(hx - fw * 1.0, hy + hr * .05);
  g.bezierCurveTo(hx - fw * 1.2, hy - hr * .8, hx - fw * .6, hy - hr * 1.18, hx, hy - hr * 1.16);
  g.bezierCurveTo(hx + fw * .6, hy - hr * 1.18, hx + fw * 1.2, hy - hr * .8, hx + fw * 1.0, hy + hr * .05);
  g.lineTo(hx + fw * .9, hy - hr * .15);
  g.bezierCurveTo(hx + fw * .8, hy - hr * hl, hx + fw * .3, hy - hr * (hl + .05), hx, hy - hr * hl);
  g.bezierCurveTo(hx - fw * .4, hy - hr * (hl + .02), hx - fw * .85, hy - hr * hl * .9, hx - fw * .9, hy - hr * .15);
  g.closePath();
}
// 現在のパスを髪として塗る：上からの光沢＋毛流れ
function hairFill(g, G, col, rnd, n, len){
  const { hx, hy, hr, fw } = G;
  const rg = g.createRadialGradient(hx - fw * .3, hy - hr * .9, hr * .05, hx, hy - hr * .4, hr * 1.4);
  rg.addColorStop(0, shade(col, .3)); rg.addColorStop(.4, col); rg.addColorStop(1, shade(col, -.55));
  g.fillStyle = rg; g.fill();
  g.save(); g.clip(); g.globalAlpha *= .4; g.lineWidth = Math.max(.6, hr * .022);
  for (let i = 0; i < n; i++){
    const x0 = hx + (rnd() - .5) * fw * 2.4, y0 = hy - hr * (1.2 - rnd() * .3), y1 = y0 + hr * len * (.5 + rnd() * .6);
    g.strokeStyle = shade(col, rnd() < .5 ? .35 : -.45);
    g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(x0 + (rnd() - .5) * fw * .5, (y0 + y1) / 2, x0 + (rnd() - .5) * fw * .8, y1); g.stroke();
  }
  g.restore();
}
function hairBack(g, G, L, rnd){
  const { hx, hy, hr, fw, shY } = G, c = L.hairC;
  if (L.hood){ g.fillStyle = hGrad(g, hx - fw * 1.5, hx + fw * 1.5, L.coat, -.55, -.6); ell(g, hx, hy + hr * .05, fw * 1.5, hr * 1.32); }
  if (L.hair === 'long'){
    g.beginPath(); g.moveTo(hx - fw * 1.05, hy - hr * .5);
    g.bezierCurveTo(hx - fw * 1.3, hy + hr * .8, hx - fw * 1.55, shY + hr * 1.5, hx - fw * 1.45, shY + hr * 2.8);
    g.lineTo(hx + fw * 1.45, shY + hr * 2.8);
    g.bezierCurveTo(hx + fw * 1.55, shY + hr * 1.5, hx + fw * 1.3, hy + hr * .8, hx + fw * 1.05, hy - hr * .5);
    g.closePath(); hairFill(g, G, c, rnd, 50, 3.5);
  }
  if (L.hair === 'bob'){
    g.beginPath(); g.moveTo(hx - fw * 1.08, hy - hr * .6);
    g.bezierCurveTo(hx - fw * 1.3, hy + hr * .2, hx - fw * 1.25, hy + hr * .7, hx - fw * 1.05, hy + hr * .82);
    g.lineTo(hx + fw * 1.05, hy + hr * .82);
    g.bezierCurveTo(hx + fw * 1.25, hy + hr * .7, hx + fw * 1.3, hy + hr * .2, hx + fw * 1.08, hy - hr * .6);
    g.closePath(); hairFill(g, G, c, rnd, 30, 1.6);
  }
  if (L.hair === 'bun'){ g.beginPath(); g.ellipse(hx + fw * .15, hy - hr * 1.12, hr * .4, hr * .32, 0, 0, Math.PI * 2); hairFill(g, G, c, rnd, 12, .6); }
  if (L.hair === 'pony'){
    g.beginPath(); g.moveTo(hx + fw * .55, hy - hr * .7);
    g.bezierCurveTo(hx + fw * 1.5, hy - hr * .5, hx + fw * 1.45, hy + hr * 1.2, hx + fw * 1.15, shY + hr * 1.2);
    g.bezierCurveTo(hx + fw * 1.0, hy + hr * 1.2, hx + fw * .95, hy, hx + fw * .55, hy - hr * .3);
    g.closePath(); hairFill(g, G, c, rnd, 20, 2.5);
  }
}
function hairFront(g, G, L, rnd){
  const { hx, hy, hr, fw, shY } = G, c = L.hairC, st = L.hair;
  const hl = { short:.62, slick:.74, messy:.56, bun:.72, pony:.52, bob:.36, long:.62 }[st] || .62;
  capPath(g, G, hl); hairFill(g, G, c, rnd, st === 'messy' ? 60 : 40, st === 'slick' ? .7 : 1.1);
  if (st === 'slick'){ g.fillStyle = 'rgba(255,255,255,.1)'; ell(g, hx - fw * .3, hy - hr * .95, fw * .45, hr * .1); }
  if (st === 'messy'){
    g.fillStyle = shade(c, -.1);
    for (let i = 0; i < 7; i++){ const px = hx - fw * .85 + i * fw * .28, py = hy - hr * (.62 + rnd() * .1); g.beginPath(); g.moveTo(px, py - hr * .1); g.lineTo(px + fw * .12, py + hr * (.12 + rnd() * .12)); g.lineTo(px + fw * .26, py - hr * .08); g.fill(); }
  }
  if (st === 'bob'){ for (const sd of [-1, 1]){ lock(g, G, sd * 1.05, sd * .72, sd * 1.0, sd * .8, hy - hr * .55, hy + hr * .8); hairFill(g, G, c, rnd, 12, 1.8); } }
  if (st === 'long'){
    const yb = shY + hr * 2.5;
    if (L.faceHidden){ // 顔を覆う髪。右目の位置にだけ隙間がある
      lock(g, G, -1.08, .28, -1.4, .15, hy - hr * .75, yb); hairFill(g, G, c, rnd, 26, 4);
      lock(g, G, .52, 1.08, .4, 1.4, hy - hr * .75, yb); hairFill(g, G, c, rnd, 20, 4);
    } else {
      lock(g, G, -1.05, -.72, -1.35, -.85, hy - hr * .5, yb); hairFill(g, G, c, rnd, 14, 4);
      lock(g, G, .72, 1.05, .85, 1.35, hy - hr * .5, yb); hairFill(g, G, c, rnd, 14, 4);
    }
  }
}
function drawNeck(g, G, L){
  const { hx, hy, hr, fw, shY } = G;
  g.beginPath(); g.moveTo(hx - fw * .42, hy + hr * .5); g.quadraticCurveTo(hx - fw * .45, shY - hr * .5, hx - fw * .62, shY - hr * .1);
  g.lineTo(hx + fw * .62, shY - hr * .1); g.quadraticCurveTo(hx + fw * .45, shY - hr * .5, hx + fw * .42, hy + hr * .5); g.closePath();
  const ng = g.createLinearGradient(0, hy + hr * .6, 0, shY); ng.addColorStop(0, shade(L.skin, -.55)); ng.addColorStop(.5, shade(L.skin, -.22)); ng.addColorStop(1, shade(L.skin, -.08));
  g.fillStyle = ng; g.fill();
}
function torsoPath(g, G){
  const { cx, hx, hr, shY, sw, hipY } = G, nL = hx - hr * .48, nR = hx + hr * .48, top = shY - hr * .42, bot = hipY + hr * .6;
  g.beginPath(); g.moveTo(nL, top);
  g.quadraticCurveTo(cx - sw * .55, shY - hr * .3, cx - sw * .96, shY + hr * .2);
  g.quadraticCurveTo(cx - sw * 1.1, shY + hr * .7, cx - sw * 1.0, shY + hr * 1.8);
  g.lineTo(cx - sw * .88, bot); g.lineTo(cx + sw * .88, bot); g.lineTo(cx + sw * 1.0, shY + hr * 1.8);
  g.quadraticCurveTo(cx + sw * 1.1, shY + hr * .7, cx + sw * .96, shY + hr * .2);
  g.quadraticCurveTo(cx + sw * .55, shY - hr * .3, nR, top);
  g.quadraticCurveTo(hx, shY + hr * .15, nL, top);
  g.closePath();
}
function drawClothes(g, G, L, rnd){
  const { cx, hx, hr, fw, shY, sw, hipY } = G, neckY = shY - hr * .4;
  g.save(); torsoPath(g, G); g.clip(); g.lineCap = 'round';
  g.strokeStyle = 'rgba(0,0,0,.2)'; g.lineWidth = hr * .05;
  for (const sd of [-1, 1]){
    g.beginPath(); g.moveTo(cx + sd * sw * .85, shY + hr * 1.2); g.quadraticCurveTo(cx + sd * sw * .55, shY + hr * 1.8, cx + sd * sw * .3, shY + hr * 1.9); g.stroke();
    g.beginPath(); g.moveTo(cx + sd * sw * .8, hipY - hr * .4); g.quadraticCurveTo(cx + sd * sw * .5, hipY - hr * .1, cx + sd * sw * .2, hipY); g.stroke();
  }
  if (L.wet){ g.fillStyle = 'rgba(40,60,60,.18)'; for (let i = 0; i < 8; i++) ell(g, cx + (rnd() - .5) * sw * 1.8, shY + rnd() * (hipY - shY), hr * (.3 + rnd() * .4), hr * (.5 + rnd() * .8)); }
  if (L.pj){
    g.fillStyle = 'rgba(255,255,255,.22)'; for (let i = 0; i < 60; i++) ell(g, cx + (rnd() - .5) * sw * 2.2, shY + rnd() * (hipY - shY + hr), hr * .05, hr * .05);
    g.fillStyle = shade(L.coat, .15);
    for (const sd of [-1, 1]){ g.beginPath(); g.moveTo(hx + sd * fw * .6, neckY - hr * .1); g.lineTo(hx + sd * fw * .05, shY + hr * .4); g.lineTo(hx + sd * fw * .8, shY + hr * .5); g.closePath(); g.fill(); }
  }
  const inner = L.shirt || L.inner;
  if (inner){
    const vb = shY + hr * (L.cardigan ? 1.9 : 2.4);
    g.fillStyle = hGrad(g, hx - fw * .6, hx + fw * .6, inner, -.25, -.3);
    g.beginPath(); g.moveTo(hx - fw * .62, neckY - hr * .1); g.lineTo(cx, vb); g.lineTo(hx + fw * .62, neckY - hr * .1); g.closePath(); g.fill();
    if (L.shirt){
      g.fillStyle = shade(L.shirt, .05);
      for (const sd of [-1, 1]){ g.beginPath(); g.moveTo(hx + sd * fw * .55, neckY - hr * .15); g.lineTo(hx + sd * fw * .05, shY + hr * .3); g.lineTo(hx + sd * fw * .5, shY + hr * .55); g.closePath(); g.fill(); }
    }
    if (L.tie){ // 酔っている男はネクタイが緩んでずれている
      const off = L.flush ? hr * .2 : 0, ky = shY + hr * .25 + off, tx = cx + (L.flush ? hr * .1 : 0);
      g.fillStyle = shade(L.tie, .12); g.beginPath(); g.moveTo(tx - hr * .14, ky - hr * .14); g.lineTo(tx + hr * .14, ky - hr * .14); g.lineTo(tx + hr * .09, ky + hr * .12); g.lineTo(tx - hr * .09, ky + hr * .12); g.closePath(); g.fill();
      g.fillStyle = hGrad(g, tx - hr * .22, tx + hr * .22, L.tie, -.35, -.45);
      g.beginPath(); g.moveTo(tx - hr * .09, ky + hr * .12); g.lineTo(tx + hr * .09, ky + hr * .12); g.lineTo(tx + hr * .22, vb + hr * .3); g.lineTo(tx - hr * .22, vb + hr * .3); g.closePath(); g.fill();
    }
    if (L.lapel || L.cardigan){
      g.strokeStyle = shade(L.coat, L.lapel ? -.45 : -.3); g.lineWidth = hr * (L.lapel ? .14 : .08);
      g.beginPath(); g.moveTo(hx - fw * .7, neckY - hr * .1); g.lineTo(cx - hr * .02, vb + hr * .1); g.moveTo(hx + fw * .7, neckY - hr * .1); g.lineTo(cx + hr * .02, vb + hr * .1); g.stroke();
    }
  }
  if (L.buttons){ g.fillStyle = shade(L.coat, .3); for (let i = 0; i < 4; i++) ell(g, cx + hr * .02, shY + hr * (L.cardigan ? 2.1 : .9) + i * hr * .85, hr * .06, hr * .06); }
  if (L.uniform){
    g.fillStyle = '#e6ebe8'; g.beginPath(); g.moveTo(hx - fw * .45, neckY - hr * .1); g.quadraticCurveTo(hx, shY + hr * .45, hx + fw * .45, neckY - hr * .1); g.closePath(); g.fill();
    g.fillStyle = shade(L.coat, .1);
    for (const sd of [-1, 1]){ g.beginPath(); g.moveTo(hx + sd * fw * .6, neckY - hr * .2); g.lineTo(hx + sd * fw * .02, shY + hr * .35); g.lineTo(hx + sd * fw * .75, shY + hr * .4); g.closePath(); g.fill(); }
    g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = hr * .03; g.beginPath(); g.moveTo(cx, shY + hr * .35); g.lineTo(cx, shY + hr * 1.1); g.stroke();
    g.fillStyle = 'rgba(240,245,242,.9)'; g.fillRect(cx - sw * 1.1, shY + hr * 1.3, sw * 2.2, hr * .22);
    const tx = cx + sw * .2, ty = shY + hr * 1.75, tw = hr * 1.05, th = hr * .48;
    g.fillStyle = '#f5f5f0'; g.fillRect(tx, ty, tw, th); g.strokeStyle = 'rgba(0,0,0,.3)'; g.lineWidth = 1; g.strokeRect(tx, ty, tw, th);
    if (L.tag){ g.fillStyle = '#222'; g.font = `${Math.max(5, hr * .28)}px "Zen Kaku Gothic New", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(L.tag, tx + tw / 2, ty + th / 2); g.textBaseline = 'alphabetic'; }
  }
  if (L.collar){
    g.fillStyle = '#e9e9e4'; g.strokeStyle = shade(L.coat, .15); g.lineWidth = hr * .05;
    g.beginPath(); g.moveTo(hx - fw * .7, neckY); g.lineTo(cx - sw * 1.0, shY + hr * .5); g.lineTo(cx - sw * .55, shY + hr * 1.5); g.lineTo(cx, shY + hr * 2.1);
    g.lineTo(cx + sw * .55, shY + hr * 1.5); g.lineTo(cx + sw * 1.0, shY + hr * .5); g.lineTo(hx + fw * .7, neckY); g.lineTo(cx, shY + hr * 1.4); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#a3262b'; ell(g, cx, shY + hr * 1.85, hr * .22, hr * .16);
    g.beginPath(); g.moveTo(cx - hr * .1, shY + hr * 1.9); g.lineTo(cx - hr * .35, shY + hr * 2.9); g.lineTo(cx - hr * .05, shY + hr * 2.75); g.moveTo(cx + hr * .1, shY + hr * 1.9); g.lineTo(cx + hr * .35, shY + hr * 2.9); g.lineTo(cx + hr * .05, shY + hr * 2.75); g.fill();
  }
  if (L.vest){
    for (const sd of [-1, 1]){
      g.fillStyle = hGrad(g, cx - sw, cx + sw, L.vest, -.4, -.45);
      g.beginPath(); g.moveTo(hx + sd * fw * .7, neckY); g.lineTo(cx + sd * sw * 1.05, shY + hr * .3); g.lineTo(cx + sd * sw * 1.0, hipY + hr); g.lineTo(cx + sd * sw * .18, hipY + hr); g.lineTo(cx + sd * sw * .18, shY + hr * 1.6); g.closePath(); g.fill();
      g.fillStyle = 'rgba(235,235,210,.85)'; g.fillRect(Math.min(cx + sd * sw * .18, cx + sd * sw * 1.05), shY + hr * 2.4, sw * .87, hr * .2);
    }
  }
  if (L.hood){
    g.strokeStyle = shade(L.coat, .35); g.lineWidth = hr * .04;
    for (const sd of [-1, 1]){ g.beginPath(); g.moveTo(hx + sd * fw * .3, neckY + hr * .1); g.lineTo(hx + sd * fw * .35, shY + hr * 1.6); g.stroke(); g.fillStyle = shade(L.coat, .5); ell(g, hx + sd * fw * .35, shY + hr * 1.65, hr * .04, hr * .1); }
  }
  if (L.apron){
    g.strokeStyle = shade(L.apron, -.25); g.lineWidth = hr * .1;
    for (const sd of [-1, 1]){ g.beginPath(); g.moveTo(cx + sd * sw * .68, shY + hr * .8); g.lineTo(hx + sd * fw * .45, neckY); g.stroke(); }
    g.fillStyle = hGrad(g, cx - sw * .8, cx + sw * .8, L.apron, -.2, -.3); g.fillRect(cx - sw * .75, shY + hr * .7, sw * 1.5, hipY - shY);
  }
  if (L.blood){ // 赤黒い染みと、垂れた跡
    for (let i = 0; i < 10; i++){
      const x = cx + (rnd() - .5) * sw * 1.3, y = shY + hr * 1.1 + rnd() * (hipY - shY - hr * .8), r = hr * (.1 + rnd() * .3);
      g.fillStyle = `rgba(${95 + rnd() * 35 | 0},16,14,${.55 + rnd() * .3})`; ell(g, x, y, r, r * (.8 + rnd() * .5));
      if (rnd() < .5){ g.fillRect(x - r * .15, y, r * .3, r * (2 + rnd() * 3)); }
    }
  }
  g.restore();
}
function drawHand(g, x, y, hr, skin, sd, band){
  const w = hr * .36, h = hr * .62;
  g.fillStyle = hGrad(g, x - w, x + w, skin, sd < 0 ? -.4 : -.05, sd < 0 ? -.05 : -.4);
  g.beginPath(); g.moveTo(x - w * .9, y); g.quadraticCurveTo(x - w * 1.05, y + h * .7, x - w * .5, y + h);
  g.quadraticCurveTo(x + w * .2, y + h * 1.12, x + w * .8, y + h * .85); g.quadraticCurveTo(x + w * 1.05, y + h * .4, x + w * .85, y); g.closePath(); g.fill();
  g.beginPath(); g.ellipse(x - sd * w * .85, y + h * .35, w * .28, h * .32, sd * .4, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(58,32,24,.3)'; g.lineWidth = Math.max(.6, hr * .025);
  for (let i = -1; i <= 1; i++){ g.beginPath(); g.moveTo(x + i * w * .32, y + h * .55); g.lineTo(x + i * w * .34, y + h * .95); g.stroke(); }
  if (band){
    for (let i = 0; i < 4; i++){
      g.fillStyle = i % 2 ? '#f4f3ee' : '#dcdbd2';
      g.beginPath(); g.moveTo(x - w * 1.05, y + h * (i * .17 - .05)); g.lineTo(x + w * 1.0, y + h * (i * .17 - .11)); g.lineTo(x + w * 1.02, y + h * (i * .17 + .08)); g.lineTo(x - w * 1.07, y + h * (i * .17 + .14)); g.closePath(); g.fill();
    }
  }
}
function drawArm(g, G, L, sd){
  const { cx, shY, sw, Hh, hr } = G;
  const sx = cx + sd * sw * .92, sy = shY + hr * .5, ex = cx + sd * sw * 1.07, ey = shY + Hh * .18, wx = cx + sd * sw * .98, wy = shY + Hh * .315;
  const ax = cx + sd * sw * 1.05, col = L.sleeve || L.coat;
  const cloth = hGrad(g, ax - hr * .6, ax + hr * .6, col, sd < 0 ? -.55 : -.1, sd < 0 ? -.1 : -.55);
  if (L.uniform){ // 半袖
    g.fillStyle = hGrad(g, ax - hr * .6, ax + hr * .6, L.skin, sd < 0 ? -.45 : -.1, sd < 0 ? -.1 : -.45);
    limb(g, sx, sy, ex, ey, hr * .55, hr * .45); g.fill(); limb(g, ex, ey, wx, wy, hr * .45, hr * .36); g.fill();
    g.fillStyle = cloth; limb(g, sx, sy, lerp(sx, ex, .55), lerp(sy, ey, .55), hr * .64, hr * .58); g.fill();
  } else {
    g.fillStyle = cloth; limb(g, sx, sy, ex, ey, hr * .6, hr * .47); g.fill();
    g.beginPath(); g.arc(ex, ey, hr * .47, 0, Math.PI * 2); g.fill();
    limb(g, ex, ey, wx, wy, hr * .47, hr * .38); g.fill();
    g.fillStyle = shade(col, -.3); limb(g, lerp(ex, wx, .9), lerp(ey, wy, .9), wx, wy, hr * .4, hr * .39); g.fill();
  }
  g.strokeStyle = 'rgba(0,0,0,.28)'; g.lineWidth = hr * .06;
  g.beginPath(); g.moveTo(sx - sd * hr * .5, sy + hr * .4); g.quadraticCurveTo(ex - sd * hr * .45, ey, wx - sd * hr * .35, wy); g.stroke();
  drawHand(g, wx, wy, hr, L.skin, sd, L.bandage === (sd < 0 ? 'R' : 'L')); // 'R' = 本人の右手（画面では左）
}
function drawLegs(g, G, L, walking, now){
  const { cx, sw, hipY, footY, hr } = G, step = walking ? Math.sin(now / 150) : 0, legC = L.legs || L.pants || '#1f2226';
  for (const sd of [-1, 1]){
    const x1 = cx + sd * sw * .4, x2 = cx + sd * sw * .34 + step * sd * hr * .35;
    limb(g, x1, hipY, x2, footY - hr * .2, sw * .4, sw * .27);
    g.fillStyle = hGrad(g, x1 - sw * .45, x1 + sw * .45, legC, -.5, -.5); g.fill();
    g.fillStyle = L.feet === 'bare' ? L.skin : (L.shoes || '#141414'); ell(g, x2, footY - hr * .1, sw * .34, hr * .2);
  }
  if (L.legs && L.pants){
    const yb = hipY + (footY - hipY) * (L.skirtLen || .42);
    g.beginPath(); g.moveTo(cx - sw * .88, hipY - hr * .2); g.lineTo(cx + sw * .88, hipY - hr * .2); g.lineTo(cx + sw * 1.0, yb); g.lineTo(cx - sw * 1.0, yb); g.closePath();
    g.fillStyle = hGrad(g, cx - sw, cx + sw, L.pants, -.5, -.5); g.fill();
  }
}
function eye(g, x, y, ew, eh, o){
  if (o.blink){ g.strokeStyle = 'rgba(30,15,12,.8)'; g.lineWidth = Math.max(.8, eh * .5); g.beginPath(); g.moveTo(x - ew, y); g.quadraticCurveTo(x, y + eh * .6, x + ew, y); g.stroke(); return; }
  if (o.alien){ // 白目のない、濡れたような黒い目
    g.fillStyle = '#07080a'; g.beginPath(); g.moveTo(x - ew * 1.1, y + eh * .3); g.quadraticCurveTo(x - ew * .2, y - eh * 2.2, x + ew * 1.15, y - eh * .6); g.quadraticCurveTo(x + ew * .2, y + eh * 1.6, x - ew * 1.1, y + eh * .3); g.fill();
    g.strokeStyle = 'rgba(200,220,255,.35)'; g.lineWidth = Math.max(.8, eh * .3); g.beginPath(); g.moveTo(x - ew * .5, y - eh * .7); g.quadraticCurveTo(x, y - eh * 1.3, x + ew * .5, y - eh * .9); g.stroke();
    return;
  }
  const op = o.stare ? 1.55 : 1, iris = o.iris || '#4a3324';
  const almond = () => { g.beginPath(); g.moveTo(x - ew, y); g.quadraticCurveTo(x, y - eh * 1.6 * op, x + ew, y); g.quadraticCurveTo(x, y + eh * 1.15 * op, x - ew, y); g.closePath(); };
  almond(); g.fillStyle = o.void ? '#050303' : o.stare ? '#e2e0da' : '#cbc4b8'; g.fill();
  if (o.void) return; // 一瞬、目が真っ黒になる
  const ir = eh * 1.2, ix = x + o.gx * ew * .35, iy = y + (o.stare ? -eh * .05 : eh * .12);
  g.save(); almond(); g.clip();
  const ig = g.createRadialGradient(ix, iy, ir * .2, ix, iy, ir); ig.addColorStop(0, shade(iris, .15)); ig.addColorStop(1, shade(iris, -.5));
  g.fillStyle = ig; ell(g, ix, iy, ir, ir);
  g.fillStyle = '#080505'; ell(g, ix, iy, ir * (o.stare ? .28 : .48), ir * (o.stare ? .28 : .48));
  g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(x - ew, y - eh * 2 * op, ew * 2, eh * 1.05 * op);
  g.restore();
  if (o.alive){ g.fillStyle = 'rgba(255,255,255,.8)'; ell(g, ix - ir * .35, iy - ir * .35, ir * .22, ir * .22); } // 人でないものの目には光が入らない
  g.strokeStyle = 'rgba(25,14,10,.85)'; g.lineWidth = Math.max(.9, eh * .45);
  g.beginPath(); g.moveTo(x - ew * 1.05, y + eh * .1); g.quadraticCurveTo(x, y - eh * 1.65 * op, x + ew * 1.05, y - eh * .05); g.stroke();
  g.strokeStyle = 'rgba(70,35,25,.35)'; g.lineWidth = Math.max(.6, eh * .2);
  g.beginPath(); g.moveTo(x - ew * .8, y - eh * 1.7 * op); g.quadraticCurveTo(x, y - eh * 2.6 * op, x + ew * .9, y - eh * 1.55 * op); g.stroke();
}
function drawFace(g, G, L, alive, rnd){
  const { hx, hy, hr, fw, t } = G, skin = L.skin, kid = !!L.kid, n = kid ? .7 : 1;
  for (const sd of [-1, 1]){ const ex = hx + sd * fw * .96, ey = hy + hr * .04; g.fillStyle = shade(skin, -.25); ell(g, ex, ey, hr * .13, hr * .22); g.fillStyle = shade(skin, -.5); ell(g, ex + sd * hr * .02, ey + hr * .02, hr * .055, hr * .11); }
  facePath(g, G, L);
  const fg = g.createRadialGradient(hx - fw * .18, hy - hr * .3, hr * .1, hx, hy + hr * .05, hr * 1.2);
  fg.addColorStop(0, shade(skin, .1)); fg.addColorStop(.5, skin); fg.addColorStop(.85, shade(skin, -.25)); fg.addColorStop(1, shade(skin, -.45));
  g.fillStyle = fg; g.fill();
  const eyY = hy - hr * .02, eX = fw * .4;
  g.save(); facePath(g, G, L); g.clip();
  softEll(g, hx - eX, eyY - hr * .02, fw * .42, hr * .23, '70,35,25', .26); softEll(g, hx + eX, eyY - hr * .02, fw * .42, hr * .23, '70,35,25', .26);
  g.fillStyle = 'rgba(70,35,25,.17)';
  g.beginPath(); g.moveTo(hx + fw * .05, eyY + hr * .05); g.quadraticCurveTo(hx + fw * .2 * n, hy + hr * .25, hx + fw * .16 * n, hy + hr * .36); g.lineTo(hx + fw * .03, hy + hr * .34); g.closePath(); g.fill();
  g.fillStyle = 'rgba(60,25,20,.25)'; ell(g, hx, hy + hr * .42, fw * .17 * n, hr * .04);
  softEll(g, hx - fw * .76, hy + hr * .38, fw * .34, hr * .4, '60,30,20', .2); softEll(g, hx + fw * .8, hy + hr * .38, fw * .34, hr * .4, '60,30,20', .2);
  g.fillStyle = 'rgba(50,20,15,.2)'; ell(g, hx, hy + hr, fw * .5, hr * .12);
  g.fillStyle = 'rgba(255,255,255,.1)'; ell(g, hx - fw * .12, hy - hr * .6, fw * .42, hr * .2); ell(g, hx - fw * .02, hy + hr * .12, fw * .05, hr * .17); ell(g, hx - fw * .48, hy + hr * .2, fw * .16, hr * .08);
  // 肌のきめと、夜の蛍光灯の下のクマ
  for (let i = 0; i < 160; i++){ g.fillStyle = rnd() < .6 ? 'rgba(90,50,40,.09)' : 'rgba(255,240,230,.07)'; ell(g, hx + (rnd() - .5) * fw * 2, hy + (rnd() - .5) * hr * 2, hr * (.006 + rnd() * .012), hr * (.006 + rnd() * .012)); }
  softEll(g, hx - eX, eyY + hr * .14, fw * .28, hr * .08, '70,40,55', .24); softEll(g, hx + eX, eyY + hr * .14, fw * .28, hr * .08, '70,40,55', .24);
  if (L.flush){ g.fillStyle = 'rgba(205,60,55,.22)'; ell(g, hx - fw * .5, hy + hr * .25, fw * .25, hr * .14); ell(g, hx + fw * .5, hy + hr * .25, fw * .25, hr * .14); ell(g, hx, hy + hr * .3, fw * .1, hr * .07); }
  if (L.stubble){ g.fillStyle = 'rgba(40,42,50,.14)'; ell(g, hx, hy + hr * .78, fw * .78, hr * .32); }
  if (L.pale){ g.fillStyle = 'rgba(120,160,170,.18)'; g.fillRect(hx - fw, hy - hr, fw * 2, hr * 2); }
  if (L.clown){ // 白塗りと、目の上の青いひし形
    g.fillStyle = 'rgba(246,244,238,.88)'; g.fillRect(hx - fw, hy - hr, fw * 2, hr * 2);
    g.fillStyle = '#2a4aa0';
    for (const sd of [-1, 1]){ const x = hx + sd * eX; g.beginPath(); g.moveTo(x, eyY - hr * .32); g.lineTo(x + fw * .1, eyY); g.lineTo(x, eyY + hr * .3); g.lineTo(x - fw * .1, eyY); g.fill(); }
  }
  if (L.old){
    g.strokeStyle = 'rgba(80,45,35,.3)'; g.lineWidth = Math.max(.6, hr * .02);
    for (let i = 0; i < 2; i++){ g.beginPath(); g.moveTo(hx - fw * .45, hy - hr * (.5 - i * .1)); g.quadraticCurveTo(hx, hy - hr * (.56 - i * .1), hx + fw * .45, hy - hr * (.5 - i * .1)); g.stroke(); }
    for (const sd of [-1, 1]){
      g.beginPath(); g.moveTo(hx + sd * fw * .2, hy + hr * .34); g.quadraticCurveTo(hx + sd * fw * .45, hy + hr * .5, hx + sd * fw * .4, hy + hr * .72); g.stroke();
      g.beginPath(); g.moveTo(hx + sd * (eX - fw * .2), eyY + hr * .12); g.quadraticCurveTo(hx + sd * eX, eyY + hr * .2, hx + sd * (eX + fw * .2), eyY + hr * .1); g.stroke();
    }
  }
  g.restore();
  const ph = Math.floor(t / 1.7), r = Math.sin(ph * 12.9898) * 43758.5453;
  const o = { alien: L.bigEyes, void: !alive && (t % 6.3) < .1, blink: L.sleep || alive && (t % 4.2) < .13, gx: alive ? (r - Math.floor(r) - .5) * 1.2 : 0, stare: L.stare, alive, iris: L.iris };
  const big = L.bigEyes ? 1.45 : 1, ew = fw * .24 * (kid ? 1.12 : 1) * big, eh = hr * .072 * (kid ? 1.25 : 1) * big;
  eye(g, hx - eX, eyY, ew, eh, o); eye(g, hx + eX, eyY, ew, eh, o);
  g.lineCap = 'round'; g.strokeStyle = shade(L.hairC, -.1); g.lineWidth = hr * (kid ? .045 : .065);
  for (const sd of [-1, 1]){ g.beginPath(); g.moveTo(hx + sd * (eX - ew), eyY - hr * .17); g.quadraticCurveTo(hx + sd * eX, eyY - hr * (L.stare ? .3 : .25), hx + sd * (eX + ew * 1.15), eyY - hr * .15); g.stroke(); }
  g.strokeStyle = 'rgba(80,40,30,.35)'; g.lineWidth = Math.max(.6, hr * .025);
  for (const sd of [-1, 1]){ g.beginPath(); g.moveTo(hx + sd * fw * .16 * n, hy + hr * .27); g.quadraticCurveTo(hx + sd * fw * .2 * n, hy + hr * .37, hx + sd * fw * .07, hy + hr * .375); g.stroke(); }
  g.fillStyle = 'rgba(40,15,12,.55)'; ell(g, hx - fw * .075 * n, hy + hr * .365, fw * .045 * n, hr * .02); ell(g, hx + fw * .075 * n, hy + hr * .365, fw * .045 * n, hr * .02);
  g.fillStyle = 'rgba(255,255,255,.13)'; ell(g, hx - fw * .02, hy + hr * .29, fw * .06 * n, hr * .04);
  const lip = L.pale ? mix(skin, '#5a6a78', .35) : mix(skin, '#9a4a44', .38);
  if (L.smile){ // 耳近くまで裂けた笑み
    const my = hy + hr * .5, mw = fw * .8;
    const upper = () => { g.moveTo(hx - mw, my - hr * .14); g.quadraticCurveTo(hx, my + hr * .1, hx + mw, my - hr * .14); };
    const mouth = () => { g.beginPath(); upper(); g.quadraticCurveTo(hx, my + hr * .45, hx - mw, my - hr * .14); g.closePath(); };
    mouth(); g.fillStyle = '#1a0806'; g.fill();
    g.save(); mouth(); g.clip();
    g.fillStyle = '#d6cfbd'; g.beginPath(); upper(); g.lineTo(hx + mw, my - hr * .02); g.quadraticCurveTo(hx, my + hr * .22, hx - mw, my - hr * .02); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(80,60,40,.5)'; g.lineWidth = Math.max(.5, hr * .015);
    for (let i = -6; i <= 6; i++){ const x = hx + i * mw * .14; g.beginPath(); g.moveTo(x, my - hr * .2); g.lineTo(x, my + hr * .25); g.stroke(); }
    g.restore();
    mouth(); g.strokeStyle = shade(lip, -.3); g.lineWidth = Math.max(.8, hr * .03); g.stroke();
  } else {
    const my = hy + hr * .58, mw = fw * (kid ? .27 : .33);
    g.fillStyle = shade(lip, -.18);
    g.beginPath(); g.moveTo(hx - mw, my); g.quadraticCurveTo(hx - mw * .45, my - hr * .08, hx, my - hr * .04); g.quadraticCurveTo(hx + mw * .45, my - hr * .08, hx + mw, my); g.quadraticCurveTo(hx, my + hr * .015, hx - mw, my); g.fill();
    g.fillStyle = lip; g.beginPath(); g.moveTo(hx - mw * .9, my); g.quadraticCurveTo(hx, my + hr * .12, hx + mw * .9, my); g.quadraticCurveTo(hx, my + hr * .02, hx - mw * .9, my); g.fill();
    g.strokeStyle = 'rgba(45,15,12,.7)'; g.lineWidth = Math.max(.7, hr * .022); g.beginPath(); g.moveTo(hx - mw, my); g.quadraticCurveTo(hx, my + hr * .025, hx + mw, my); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.12)'; ell(g, hx, my + hr * .065, mw * .35, hr * .018);
    g.fillStyle = 'rgba(50,20,15,.15)'; ell(g, hx, my + hr * .17, mw * .55, hr * .04);
  }
  if (L.clown){
    g.strokeStyle = 'rgba(190,20,30,.8)'; g.lineWidth = hr * .07;
    g.beginPath(); g.moveTo(hx - fw * .5, hy + hr * .45); g.quadraticCurveTo(hx, hy + hr * .85, hx + fw * .5, hy + hr * .45); g.stroke();
    g.fillStyle = '#d0202a'; ell(g, hx, hy + hr * .3, fw * .14, fw * .14);
    g.fillStyle = 'rgba(255,255,255,.5)'; ell(g, hx - fw * .04, hy + hr * .26, fw * .04, fw * .04);
  }
}
function drawRabbitMask(g, G, alive, now){
  const { hx, hy, hr, fw } = G;
  for (const sd of [-1, 1]){
    g.fillStyle = '#ecebe6'; g.beginPath(); g.ellipse(hx + sd * fw * .45, hy - hr * 1.75, fw * .26, hr * .9, sd * .15, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#e8b4bc'; g.beginPath(); g.ellipse(hx + sd * fw * .45, hy - hr * 1.7, fw * .12, hr * .7, sd * .15, 0, Math.PI * 2); g.fill();
  }
  const mg = g.createRadialGradient(hx - fw * .3, hy - hr * .4, hr * .1, hx, hy, hr * 1.3); mg.addColorStop(0, '#fbfaf6'); mg.addColorStop(1, '#bdbbb4');
  g.fillStyle = mg; ell(g, hx, hy - hr * .05, fw * 1.18, hr * 1.12);
  g.fillStyle = '#e8b4bc'; ell(g, hx - fw * .55, hy + hr * .3, fw * .18, hr * .08); ell(g, hx + fw * .55, hy + hr * .3, fw * .18, hr * .08);
  g.fillStyle = '#0a0808'; ell(g, hx - fw * .4, hy - hr * .05, fw * .17, hr * .14); ell(g, hx + fw * .4, hy - hr * .05, fw * .17, hr * .14);
  if (alive && (now / 1000) % 4.2 > .13){ g.fillStyle = 'rgba(255,255,255,.7)'; ell(g, hx - fw * .38, hy - hr * .07, fw * .025, fw * .025); ell(g, hx + fw * .42, hy - hr * .07, fw * .025, fw * .025); } // 穴の奥で光る人の目
  g.fillStyle = '#d88a96'; g.beginPath(); g.moveTo(hx - fw * .08, hy + hr * .22); g.lineTo(hx + fw * .08, hy + hr * .22); g.lineTo(hx, hy + hr * .32); g.fill();
  g.strokeStyle = '#6a5a5a'; g.lineWidth = Math.max(.8, hr * .025);
  g.beginPath(); g.moveTo(hx, hy + hr * .32); g.lineTo(hx, hy + hr * .45); g.moveTo(hx - fw * .2, hy + hr * .5); g.quadraticCurveTo(hx, hy + hr * .42, hx + fw * .2, hy + hr * .5); g.stroke();
}
function drawPerson(g, c, cx, footY, s, a, now, walking){
  const L = c.look, alive = !!c.human, G = personGeo(L, cx, footY, s, now, alive), seed = hashStr(c.who);
  const { hx, hy, hr, fw, shY, sw, hipY } = G;
  g.save(); g.globalAlpha = a; g.lineJoin = 'round';
  drawLegs(g, G, L, walking, now);
  // 人でないものは、レジ前にいるあいだ首がじわじわ傾いていく
  const tilt = !alive && S.phase === 'counter' && S.cur === c ? Math.min(.22, (now - S.counterT0) / 50000) : 0;
  const headTf = () => { g.save(); g.translate(hx, hy + hr * .9); g.rotate(tilt); g.translate(-hx, -(hy + hr * .9)); };
  headTf(); hairBack(g, G, L, rng(seed + 1)); g.restore();
  drawNeck(g, G, L);
  torsoPath(g, G);
  g.fillStyle = hGrad(g, G.cx - sw * 1.05, G.cx + sw * 1.05, L.coat, -.5, -.55); g.fill();
  const vg = g.createLinearGradient(0, shY - hr * .5, 0, hipY); vg.addColorStop(0, 'rgba(255,255,255,.12)'); vg.addColorStop(.3, 'rgba(255,255,255,0)'); vg.addColorStop(1, 'rgba(0,0,0,.35)');
  g.fillStyle = vg; g.fill();
  drawClothes(g, G, L, rng(seed));
  drawArm(g, G, L, -1); drawArm(g, G, L, 1);
  if (L.doll){ // 胸に抱いた日本人形
    const dx = G.cx - sw * .3, dy = shY + hr * 1.9, dr = hr * .34;
    g.fillStyle = '#8a1e24'; g.beginPath(); g.moveTo(dx - dr * 1.1, dy + dr * .6); g.lineTo(dx + dr * 1.1, dy + dr * .6); g.lineTo(dx + dr * 1.5, dy + dr * 3.2); g.lineTo(dx - dr * 1.5, dy + dr * 3.2); g.closePath(); g.fill();
    g.fillStyle = '#efe9e0'; ell(g, dx, dy, dr * .9, dr);
    g.fillStyle = '#0c0a0a'; g.beginPath(); g.ellipse(dx, dy - dr * .25, dr, dr * .85, 0, Math.PI, 0); g.fill();
    g.fillRect(dx - dr, dy - dr * .3, dr * .3, dr * 1.3); g.fillRect(dx + dr * .7, dy - dr * .3, dr * .3, dr * 1.3); g.fillRect(dx - dr * .9, dy - dr * .6, dr * 1.8, dr * .3);
    ell(g, dx - dr * .3, dy + dr * .05, dr * .09, dr * .11); ell(g, dx + dr * .3, dy + dr * .05, dr * .09, dr * .11);
    g.fillStyle = '#b02a30'; ell(g, dx, dy + dr * .5, dr * .1, dr * .05);
    g.fillStyle = shade(L.skin, -.1); ell(g, dx + dr * 1.2, dy + dr * 2, hr * .2, hr * .25);
  }
  if (L.helmet){ // 小脇に抱えたヘルメット
    const x = G.cx + sw * 1.25, y = hipY - hr * .9;
    g.fillStyle = hGrad(g, x - hr * .9, x + hr * .9, '#e0b422', -.35, -.5); g.beginPath(); g.ellipse(x, y, hr * .85, hr * .7, 0, Math.PI, 0); g.fill();
    g.fillStyle = shade('#e0b422', -.25); g.fillRect(x - hr, y - hr * .02, hr * 2, hr * .14);
    g.fillStyle = 'rgba(255,255,255,.25)'; ell(g, x - hr * .3, y - hr * .45, hr * .25, hr * .1);
  }
  headTf();
  drawFace(g, G, L, alive, rng(seed + 3));
  hairFront(g, G, L, rng(seed + 2));
  if (L.mask === 'rabbit') drawRabbitMask(g, G, alive, now);
  if (L.cap === 'police'){
    g.fillStyle = hGrad(g, hx - fw * 1.1, hx + fw * 1.1, '#1d2a44', -.4, -.5);
    g.beginPath(); g.moveTo(hx - fw, hy - hr * .55); g.lineTo(hx - fw * 1.18, hy - hr * 1.1); g.quadraticCurveTo(hx, hy - hr * 1.45, hx + fw * 1.18, hy - hr * 1.1); g.lineTo(hx + fw, hy - hr * .55); g.closePath(); g.fill();
    g.fillStyle = '#0a0a0c'; g.beginPath(); g.ellipse(hx, hy - hr * .55, fw * 1.05, hr * .16, 0, 0, Math.PI); g.fill();
    g.fillStyle = '#c9a43a'; ell(g, hx, hy - hr * .85, hr * .12, hr * .14);
  }
  if (L.foil){ // アルミホイルの帽子
    g.fillStyle = hGrad(g, hx - fw, hx + fw, '#c8ccd0', -.3, -.4);
    g.beginPath(); g.moveTo(hx - fw * 1.02, hy - hr * .5); g.lineTo(hx + fw * .1, hy - hr * 1.75); g.lineTo(hx + fw * 1.02, hy - hr * .5); g.quadraticCurveTo(hx, hy - hr * .7, hx - fw * 1.02, hy - hr * .5); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = Math.max(.6, hr * .02); const fr = rng(seed + 9);
    for (let i = 0; i < 9; i++){ const x = hx + (fr() - .5) * fw * 1.2, y = hy - hr * (.7 + fr() * .8); g.beginPath(); g.moveTo(x, y); g.lineTo(x + (fr() - .5) * fw * .4, y + hr * .15); g.stroke(); }
  }
  if (L.hood){
    g.strokeStyle = shade(L.coat, .02); g.lineWidth = hr * .32; g.beginPath(); g.ellipse(hx, hy + hr * .02, fw * 1.2, hr * 1.2, 0, Math.PI * .72, Math.PI * 2.28); g.stroke();
    g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = hr * .06; g.beginPath(); g.ellipse(hx, hy + hr * .02, fw * 1.05, hr * 1.06, 0, Math.PI * .75, Math.PI * 2.25); g.stroke();
  }
  if (L.glasses || L.shades){
    const eyY = hy - hr * .02, eX = fw * .4, gw = fw * .32, gh = hr * .16;
    g.strokeStyle = 'rgba(25,25,28,.9)'; g.lineWidth = Math.max(.8, hr * .03);
    for (const sd of [-1, 1]){
      const x = hx + sd * eX - gw;
      g.fillStyle = L.shades ? 'rgba(6,6,8,.96)' : 'rgba(200,225,235,.07)'; g.beginPath(); g.rect(x, eyY - gh, gw * 2, gh * 2); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(hx + sd * (eX + gw), eyY - gh * .6); g.lineTo(hx + sd * fw * .96, eyY - gh * .3); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.28)'; g.beginPath(); g.moveTo(x + gw * .4, eyY - gh * .7); g.lineTo(x + gw * .1, eyY + gh * .3); g.stroke(); g.strokeStyle = 'rgba(25,25,28,.9)';
    }
    g.beginPath(); g.moveTo(hx - eX + gw, eyY - gh * .3); g.quadraticCurveTo(hx, eyY - gh * .7, hx + eX - gw, eyY - gh * .3); g.stroke();
  }
  g.restore();
  if (L.wet){
    g.fillStyle = 'rgba(190,215,215,.7)';
    for (let i = 0; i < 7; i++){ const dx = hx - fw * 1.4 + i * fw * .47, dy = shY + hr * 2.6 + ((now / 7 + i * 37) % 70) * G.Hh / 480; ell(g, dx, dy, hr * .04, hr * .08); }
  }
  g.restore();
}
function drawCounter(g, now){
  const tg = g.createLinearGradient(0, 452, 0, 492); tg.addColorStop(0, '#a9b2ad'); tg.addColorStop(1, '#d0d8d4');
  g.fillStyle = tg; g.fillRect(0, 452, W, 40);
  g.fillStyle = '#eef3f0'; g.fillRect(0, 452, W, 2);
  g.fillStyle = '#242a28'; g.fillRect(0, 492, W, 68);
  g.fillStyle = '#1a1f1d'; g.fillRect(0, 492, W, 4);
  // レジ
  g.fillStyle = '#2f3533'; g.fillRect(722, 410, 150, 48);
  g.fillStyle = '#1a1f1d'; g.fillRect(744, 362, 96, 50);
  g.fillStyle = S.cur && S.phase === 'counter' ? '#1d5a45' : '#0f2a22'; g.fillRect(750, 368, 84, 36);
  g.fillStyle = 'rgba(200,255,230,.8)'; g.font = '13px "DotGothic16", monospace'; g.textAlign = 'center';
  g.fillText(S.cur && S.phase === 'counter' ? '¥ ----' : '研修中', 792, 391);
  // 電話
  const ring = S.ringing && Math.floor(now / 250) % 2 === 0;
  g.fillStyle = '#2b302e'; g.fillRect(60, 424, 130, 32);
  g.fillStyle = '#1c201f'; g.fillRect(66, 414, 118, 14);
  g.fillStyle = S.ringing ? (ring ? '#9ff0c6' : '#5fb08a') : '#1f332b'; g.fillRect(74, 431, 110, 18);
  if (S.phoneDisplay){ g.fillStyle = '#0b1a14'; g.font = '11px "DotGothic16", monospace'; g.textAlign = 'center'; g.fillText(S.phoneDisplay, 129, 444); }
  // 商品
  if (S.cur && S.phase === 'counter' && S.cur.items){
    S.cur.items.forEach((it, i) => {
      const x = 330 + i * 70; g.fillStyle = PRODUCT[(i * 3 + it.length) % PRODUCT.length]; g.fillRect(x, 430, 54, 28);
      g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(x, 430, 54, 5);
    });
  }
}
function drawShoe(x, y, w, ang, L){
  const g = ctx, type = L.feet || 'leather', col = L.shoes || '#141414';
  g.save(); g.translate(x, y); g.rotate(ang);
  if (type === 'bare' || type === 'sandal'){
    if (type === 'sandal'){ g.fillStyle = shade(col, -.2); ell(g, 0, w * .12, w * .6, w * .82); }
    g.fillStyle = hGrad(g, -w * .5, w * .5, L.skin, -.35, -.4); ell(g, 0, 0, w * .44, w * .6);
    for (const [tx, ty, tr] of [[-.26, .5, .11], [-.08, .58, .085], [.07, .56, .075], [.2, .52, .07], [.31, .44, .06]]){
      g.fillStyle = shade(L.skin, -.05); ell(g, tx * w, ty * w, tr * w, tr * w * 1.15);
      g.fillStyle = 'rgba(255,255,255,.25)'; ell(g, tx * w, ty * w + tr * w * .3, tr * w * .5, tr * w * .4);
    }
    if (type === 'sandal'){ g.fillStyle = col; g.fillRect(-w * .5, -w * .1, w, w * .2); }
  } else {
    g.fillStyle = type === 'sneaker' ? '#e7e4dc' : type === 'boots' ? '#3a2a1a' : '#0b0b0b'; ell(g, 0, w * .08, w * .58, w * .78);
    g.fillStyle = hGrad(g, -w * .5, w * .5, col, -.45, -.5); ell(g, 0, 0, w * .5, w * .68);
    g.fillStyle = type === 'leather' ? 'rgba(255,255,255,.28)' : 'rgba(255,255,255,.12)'; ell(g, -w * .12, w * .38, w * .16, w * .09);
    if (type === 'sneaker' || type === 'boots'){
      g.strokeStyle = type === 'sneaker' ? 'rgba(80,80,80,.6)' : 'rgba(20,15,10,.7)'; g.lineWidth = 1.5;
      for (let i = 0; i < 4; i++){ g.beginPath(); g.moveTo(-w * .18, -w * .3 + i * w * .13); g.lineTo(w * .18, -w * .28 + i * w * .13); g.stroke(); }
    }
  }
  g.restore();
}
function drawFeet(now){
  ctx.fillStyle = '#3a4440'; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(0,0,0,.28)'; ctx.lineWidth = 1;
  for (let i = -6; i <= 6; i++){ ctx.beginPath(); ctx.moveTo(480 + i * 118, 0); ctx.lineTo(480 + i * 150, 480); ctx.stroke(); }
  for (let y = 30; y < 480; y += 34 + y * .12){ ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  const lp = ctx.createRadialGradient(480, 300, 20, 480, 300, 420); lp.addColorStop(0, 'rgba(235,255,245,.16)'); lp.addColorStop(1, 'rgba(235,255,245,0)');
  ctx.fillStyle = lp; ctx.fillRect(0, 0, W, 480);
  const c = S.cur;
  if (c && S.phase === 'counter'){
    const L = c.look, kid = !!L.kid, legW = kid ? 32 : 46, gap = kid ? 18 : 26, shoeY = kid ? 384 : 366;
    const xs = [480 - gap / 2 - legW / 2, 480 + gap / 2 + legW / 2], skirt = L.legs && L.pants;
    if (L.wet){
      ctx.fillStyle = 'rgba(140,170,170,.22)'; ell(ctx, 480, shoeY + 12, 200, 60);
      ctx.strokeStyle = 'rgba(200,230,230,.25)'; ctx.lineWidth = 1.5; const rr = (now / 20) % 80;
      ctx.beginPath(); ctx.ellipse(470, shoeY + 20, 20 + rr, 6 + rr * .3, 0, 0, Math.PI * 2); ctx.stroke();
    }
    if (c.shadow){
      const sg = ctx.createRadialGradient(480, shoeY - 40, 10, 480, shoeY - 110, 230);
      sg.addColorStop(0, 'rgba(0,0,0,.6)'); sg.addColorStop(.6, 'rgba(0,0,0,.3)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = sg; ell(ctx, 480, shoeY - 110, legW * 2.8, 200);
    }
    xs.forEach((x, i) => drawShoe(x + (i ? 6 : -6), shoeY, legW * 1.15, i ? -.12 : .12, L));
    xs.forEach(x => {
      const bottom = shoeY - legW * (skirt ? .35 : .2);
      const leg = top => { ctx.beginPath(); ctx.moveTo(x - legW * .55, top); ctx.lineTo(x + legW * .55, top); ctx.lineTo(x + legW * .5, bottom); ctx.quadraticCurveTo(x, bottom + legW * .18, x - legW * .5, bottom); ctx.closePath(); };
      leg(-10); ctx.fillStyle = hGrad(ctx, x - legW * .6, x + legW * .6, skirt ? L.legs : (L.pants || '#1f2226'), -.5, -.55); ctx.fill();
      if (skirt && L.socks){ leg(bottom - 130); ctx.fillStyle = hGrad(ctx, x - legW * .6, x + legW * .6, L.socks, -.4, -.5); ctx.fill(); }
      if (!skirt){
        ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 2;
        for (let k = 0; k < 2; k++){ ctx.beginPath(); ctx.moveTo(x - legW * .45, bottom - 18 - k * 14); ctx.quadraticCurveTo(x, bottom - 8 - k * 14, x + legW * .45, bottom - 20 - k * 14); ctx.stroke(); }
        ctx.strokeStyle = 'rgba(255,255,255,.07)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - legW * .1, -10); ctx.lineTo(x - legW * .08, bottom - 30); ctx.stroke();
      }
    });
    if (skirt){
      const hem = L.skirtLen > .5 ? 200 : 80;
      ctx.beginPath(); ctx.moveTo(380, -10); ctx.lineTo(580, -10); ctx.lineTo(612, hem); ctx.lineTo(348, hem); ctx.closePath();
      ctx.fillStyle = hGrad(ctx, 340, 620, L.pants, -.5, -.5); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 2;
      for (let i = 1; i < 6; i++){ ctx.beginPath(); ctx.moveTo(380 + i * 33, -10); ctx.lineTo(348 + i * 44, hem); ctx.stroke(); }
    }
    if (L.wet){ ctx.fillStyle = 'rgba(200,230,230,.7)'; ell(ctx, xs[0] - 10, 120 + (now / 6) % 240, 2, 4); ell(ctx, xs[1] + 12, 60 + (now / 5) % 300, 2, 4); }
  }
  const tg = ctx.createLinearGradient(0, 470, 0, 506); tg.addColorStop(0, '#d0d8d4'); tg.addColorStop(1, '#a9b2ad');
  ctx.fillStyle = tg; ctx.fillRect(0, 470, W, 36); ctx.fillStyle = '#242a28'; ctx.fillRect(0, 506, W, 54);
  ctx.font = '14px "DotGothic16", monospace'; ctx.textAlign = 'left'; ctx.fillStyle = '#d4ddd7'; ctx.fillText('— 身を乗り出して、足元を見ている —', 20, 34);
}
/* ---------- 怪異（夜が更けるほど、影が減るほど増える） ---------- */
// ノイズを絞って左右に振る。足音やささやきに使う
function burst(t, dur, vol, type, freq, q, pan){
  const c = A.c, s = c.createBufferSource(); s.buffer = A.noise;
  const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = c.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .02); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  s.connect(f); f.connect(g);
  let out = g; if (c.createStereoPanner){ const sp = c.createStereoPanner(); sp.pan.value = pan; g.connect(sp); out = sp; }
  out.connect(A.m); s.start(t); s.stop(t + dur + .05);
}
function sKnock(){ if (!A.c) return; const t = at(); for (let i = 0; i < 3; i++){ tone(90, t + i * .32, .18, 'sine', .4, 60); burst(t + i * .32, .08, .25, 'bandpass', 400, 1.5, -.7); } }
function sSteps(pan){ if (!A.c) return; const t = at(); for (let i = 0; i < 5; i++) burst(t + i * .55, .2, .5 * (1 - i * .12), 'lowpass', 220, 1, pan); }
function sCan(){ if (!A.c) return; const t = at(); [0, .18, .3, .38].forEach((d, i) => { tone(1900 - i * 200, t + d, .15, 'triangle', .08 / (i + 1)); noise(t + d, .06, .1, 3000, 3); }); }
function sWhisper(pan){ if (!A.c) return; const t = at(); for (let i = 0; i < 12; i++) burst(t + i * .1 + Math.random() * .04, .09, .14, 'bandpass', 2200 + Math.random() * 1400, 5, pan); }
const aisleOn = now => S.aisle && now >= S.aisle.t0 && now < S.aisle.t0 + 1400;
function omen(now){
  const kinds = ['blackout', 'aisle', 'knock', 'steps', 'can', 'whisper', 'camGhost', 'lcd', 'crow', 'moths', 'rat', 'ufo'];
  if (S.flashes < 2 && S.idx > 4) kinds.push('flash');
  const side = Math.random() < .5 ? -.85 : .85;
  switch (kinds[Math.floor(Math.random() * kinds.length)]){
    case 'blackout': S.dark = { t0: now, dur: 1500 }; S.aisle = { t0: now + 1500 }; sDoorLock(); break; // 明かりが戻ると、棚の間に誰かいる
    case 'aisle':
      S.aisle = { t0: now };
      if (S.pet) toast(`（${S.pet === 'cat' ? '猫' : '犬'}が、棚の間をじっと見ている）`, 480, 420, true);
      break;
    case 'crow': S.crow = { t0: now, x: 440 + Math.random() * 80, y: 190 + Math.random() * 90 }; sCrow(); toast('バンッ！', 480, 140); break;
    case 'moths': S.moths = { t0: now }; break;
    case 'rat': S.rat = { t0: now }; sSqueak(); break;
    case 'ufo': S.ufo = { t0: now }; sUFO(); break;
    case 'knock': sKnock(); toast('コン、コン、コン', 150, 170, true); break;
    case 'steps': sSteps(side); break;
    case 'can': sCan(); toast('カラン……', 180 + Math.random() * 160, 300, true); break;
    case 'whisper': sWhisper(side); toast(`……${S.name}……`, side < 0 ? 140 : 820, 240 + Math.random() * 120, true); break;
    case 'camGhost': S.camGhost = now + 2500; break;
    case 'lcd':
      if (!S.ringing){ S.phoneDisplay = 'すぐうしろ'; setTimeout(() => { if (!S.ringing && S.phoneDisplay === 'すぐうしろ') S.phoneDisplay = ''; }, 1600); }
      break;
    case 'flash': S.flash = { t0: now }; S.flashes++; if (A.c) noise(at(), .12, .25, 1500, .8); break;
  }
}

/* ---------- 動物と、動物の怪異 ---------- */
function sMeow(){ if (!A.c) return; const t = at(); tone(720, t, .45, 'triangle', .08, 480); tone(1440, t, .3, 'sine', .02, 960); }
function sBark(){ if (!A.c) return; const t = at(); for (let i = 0; i < 2; i++){ tone(320, t + i * .25, .14, 'sawtooth', .08, 180); noise(t + i * .25, .1, .15, 900, 1); } }
function sHiss(){ if (!A.c) return; burst(at(), .7, .25, 'highpass', 3000, .7, 0); }
function sGrowl(){ if (!A.c) return; const t = at(); tone(70, t, 1, 'sawtooth', .1, 60); burst(t, 1, .2, 'lowpass', 200, 2, 0); }
function sCrow(){ if (!A.c) return; const t = at(); noise(t, .25, .6, 300, .5); tone(80, t, .3, 'sine', .5, 40); [.35, .7].forEach(d => tone(900, t + d, .22, 'sawtooth', .05, 600)); }
function sUFO(){ if (!A.c) return; const t = at(); tone(110, t, 4, 'sine', .14, 112); tone(220.5, t, 4, 'sine', .06, 330); tone(3500, t, 3, 'sine', .01, 4200); }
function sSqueak(){ if (!A.c) return; const t = at(); tone(3200, t, .08, 'sine', .04, 3800); tone(3400, t + .15, .07, 'sine', .03, 4000); }
// 本物の動物には影があり、瞬きをし、尻尾が動く。偽物は人間の目をしている
function drawAnimal(g, a, cx, footY, s, now, o = {}){
  const real = !a.fake, t = now / 1000, hiss = o.hiss;
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
  if (real){ g.fillStyle = 'rgba(0,0,0,.35)'; ell(g, cx + 8 * s, footY, 44 * s, 9 * s); }
  const eye = (x, y, rx, ry, iris, slit) => {
    if (o.hollow){ g.fillStyle = '#000'; ell(g, x, y, rx * 1.5, ry * 1.6); return; }
    if (real && (t % 3.7) < .14){ g.strokeStyle = '#111'; g.lineWidth = 1.5 * s; g.beginPath(); g.moveTo(x - rx, y); g.quadraticCurveTo(x, y + ry * .5, x + rx, y); g.stroke(); return; }
    if (real){
      g.fillStyle = iris; ell(g, x, y, rx, ry);
      g.fillStyle = '#050505'; if (slit) ell(g, x, y, rx * .22, ry * .9); else ell(g, x, y, rx * .55, ry * .6);
      g.fillStyle = 'rgba(255,255,255,.85)'; ell(g, x - rx * .35, y - ry * .35, rx * .22, ry * .22);
    } else {
      g.fillStyle = '#ddd6cb'; ell(g, x, y, rx * 1.15, ry * .95);
      g.fillStyle = '#3a2a20'; ell(g, x, y, ry * .7, ry * .7);
      g.fillStyle = '#050505'; ell(g, x, y, ry * .3, ry * .3);
    }
  };
  if (a.animal === 'cat'){
    const col = '#131314', sway = real ? Math.sin(t * 1.3) * 14 * s : 0;
    g.strokeStyle = col; g.lineWidth = 9 * s;
    g.beginPath(); g.moveTo(cx + 28 * s, footY - 10 * s); g.quadraticCurveTo(cx + 66 * s, footY - 20 * s, cx + 58 * s + sway, footY - 74 * s); g.stroke();
    const bg = g.createRadialGradient(cx - 10 * s, footY - 60 * s, 4 * s, cx, footY - 40 * s, 50 * s); bg.addColorStop(0, '#3a3a3e'); bg.addColorStop(1, col);
    g.fillStyle = bg; ell(g, cx, footY - 40 * s, 34 * s, (hiss ? 48 : 42) * s);
    g.fillStyle = col; g.fillRect(cx - 17 * s, footY - 40 * s, 11 * s, 40 * s); g.fillRect(cx + 6 * s, footY - 40 * s, 11 * s, 40 * s);
    ell(g, cx - 11 * s, footY - 2 * s, 8 * s, 4 * s); ell(g, cx + 12 * s, footY - 2 * s, 8 * s, 4 * s);
    const hy = footY - (hiss ? 92 : 98) * s;
    for (const sd of [-1, 1]){ // 威嚇すると耳が後ろに倒れる
      const tipX = cx + sd * (hiss ? 34 : 20) * s, tipY = hy - (hiss ? 22 : 40) * s;
      g.fillStyle = col; g.beginPath(); g.moveTo(cx + sd * 26 * s, hy - 6 * s); g.lineTo(tipX, tipY); g.lineTo(cx + sd * 6 * s, hy - 20 * s); g.closePath(); g.fill();
      g.fillStyle = 'rgba(190,110,120,.5)'; g.beginPath(); g.moveTo(cx + sd * 21 * s, hy - 10 * s); g.lineTo(lerp(cx + sd * 21 * s, tipX, .8), lerp(hy - 10 * s, tipY, .8)); g.lineTo(cx + sd * 10 * s, hy - 19 * s); g.closePath(); g.fill();
    }
    g.fillStyle = bg; ell(g, cx, hy, 28 * s, 24 * s);
    eye(cx - 11 * s, hy - 2 * s, 6.5 * s, 5.5 * s, '#b9c94a', true); eye(cx + 11 * s, hy - 2 * s, 6.5 * s, 5.5 * s, '#b9c94a', true);
    g.fillStyle = '#c98a90'; g.beginPath(); g.moveTo(cx - 3 * s, hy + 6 * s); g.lineTo(cx + 3 * s, hy + 6 * s); g.lineTo(cx, hy + 9 * s); g.fill();
    if (hiss){ g.fillStyle = '#3a0c10'; ell(g, cx, hy + 14 * s, 8 * s, 6 * s); g.fillStyle = '#eeeeee'; g.fillRect(cx - 6 * s, hy + 9 * s, 2 * s, 5 * s); g.fillRect(cx + 4 * s, hy + 9 * s, 2 * s, 5 * s); }
    g.strokeStyle = 'rgba(220,220,220,.5)'; g.lineWidth = .8 * s;
    for (const sd of [-1, 1]) for (let i = -1; i <= 1; i++){ g.beginPath(); g.moveTo(cx + sd * 8 * s, hy + 8 * s); g.lineTo(cx + sd * 34 * s, hy + (6 + i * 5) * s); g.stroke(); }
  } else {
    const col = '#9a6a3c', light = '#d8b48a', wag = real && !hiss ? Math.sin(t * 9) * 16 * s : 0;
    g.strokeStyle = col; g.lineWidth = 10 * s;
    g.beginPath(); g.moveTo(cx + 30 * s, footY - 14 * s); g.quadraticCurveTo(cx + 54 * s, footY - 30 * s, cx + 50 * s + wag, footY - 64 * s); g.stroke();
    g.fillStyle = hGrad(g, cx - 42 * s, cx + 42 * s, col, -.4, -.45); ell(g, cx, footY - 45 * s, 40 * s, 48 * s);
    g.fillStyle = light; ell(g, cx, footY - 52 * s, 20 * s, 30 * s);
    g.fillStyle = col; g.fillRect(cx - 20 * s, footY - 44 * s, 12 * s, 44 * s); g.fillRect(cx + 8 * s, footY - 44 * s, 12 * s, 44 * s);
    g.fillStyle = light; ell(g, cx - 14 * s, footY - 2 * s, 9 * s, 4 * s); ell(g, cx + 14 * s, footY - 2 * s, 9 * s, 4 * s);
    const hy = footY - 106 * s;
    g.fillStyle = shade(col, -.35);
    for (const sd of [-1, 1]){ g.beginPath(); g.ellipse(cx + sd * 27 * s, hy + 4 * s, 9 * s, 20 * s, sd * -.35, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = hGrad(g, cx - 30 * s, cx + 30 * s, col, -.3, -.35); ell(g, cx, hy, 28 * s, 26 * s);
    g.fillStyle = light; ell(g, cx, hy + 13 * s, 15 * s, 11 * s);
    g.fillStyle = '#111111'; ell(g, cx, hy + 8 * s, 6 * s, 4 * s);
    eye(cx - 11 * s, hy - 6 * s, 4.5 * s, 4.5 * s, '#3a2414', false); eye(cx + 11 * s, hy - 6 * s, 4.5 * s, 4.5 * s, '#3a2414', false);
    if (hiss){
      g.fillStyle = '#eeeeee'; for (let i = -2; i <= 2; i++) g.fillRect(cx + i * 3.4 * s - s, hy + 17 * s, 2 * s, 4 * s);
      g.strokeStyle = '#3a1c10'; g.lineWidth = 1.5 * s; g.beginPath(); g.moveTo(cx - 9 * s, hy + 17 * s); g.lineTo(cx + 9 * s, hy + 17 * s); g.stroke();
    } else if (real){ g.fillStyle = '#d06070'; ell(g, cx + 2 * s, hy + 22 * s, 4 * s, 6 * s); }
  }
  g.restore();
}
// 店の中の相棒と、ドアの外で待つ動物。偽物の動物はカメラに映らない
function drawCreatures(g, now, cam){
  if (S.pet) drawAnimal(g, { animal: S.pet }, 300, 400, .62, now, { hiss: now < S.petHiss });
  const a = S.ev && S.ev.type === 'animal' && S.animalAt ? S.ev : null;
  if (a && !(cam && a.fake)){ g.save(); g.beginPath(); g.rect(406, 146, 148, 189); g.clip(); drawAnimal(g, a, 480, 333, .5, now); g.restore(); }
}
function drawOmens(g, now){
  if (S.ufo && now - S.ufo.t0 < 4000){ // ドアの外が青白く光る
    const a = Math.sin((now - S.ufo.t0) / 4000 * Math.PI) * (.7 + .3 * Math.sin(now / 60));
    g.save(); g.beginPath(); g.rect(406, 146, 148, 189); g.clip();
    const ug = g.createRadialGradient(480, 120, 10, 480, 200, 200); ug.addColorStop(0, `rgba(230,250,255,${a})`); ug.addColorStop(1, `rgba(140,200,255,${a * .3})`);
    g.fillStyle = ug; g.fillRect(406, 146, 148, 189); g.restore();
    g.fillStyle = `rgba(200,235,255,${a * .12})`; g.fillRect(0, 335, W, H - 335);
  }
  if (S.crow && now - S.crow.t0 < 2600){ // ガラスに激突したカラスと、ひび
    const { x, y } = S.crow;
    g.save(); g.beginPath(); g.rect(406, 146, 148, 189); g.clip(); g.globalAlpha = 1 - (now - S.crow.t0) / 2600;
    g.fillStyle = '#060606'; ell(g, x, y, 12, 9); ell(g, x - 10, y - 7, 6, 6);
    g.beginPath(); g.moveTo(x - 4, y - 2); g.lineTo(x - 40, y - 26); g.lineTo(x - 30, y + 2); g.lineTo(x - 44, y + 10); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(x + 4, y - 2); g.lineTo(x + 42, y - 22); g.lineTo(x + 32, y + 4); g.lineTo(x + 46, y + 14); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1;
    for (let i = 0; i < 6; i++){ const an = i * 1.05; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(an) * 34, y + Math.sin(an) * 30); g.stroke(); }
    g.restore();
  }
  if (S.moths && now - S.moths.t0 < 6000){ // 蛍光灯に群がる蛾
    const r = rng(7); g.fillStyle = 'rgba(210,200,170,.8)';
    for (let i = 0; i < 26; i++){ const bx = 180 + r() * 600, by = 30 + r() * 70, sp = .5 + r(); ell(g, bx + Math.sin(now / 90 * sp + i) * 30, by + Math.cos(now / 70 * sp + i * 2) * 18, 2.2, 1.5); }
  }
  if (S.rat && now - S.rat.t0 < 1300){ // 床を横切るネズミ
    const x = lerp(-30, 990, (now - S.rat.t0) / 1300), y = 432;
    g.fillStyle = '#1a1614'; ell(g, x, y, 13, 6); ell(g, x + 12, y - 1, 6, 4.5);
    g.strokeStyle = '#1a1614'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x - 12, y); g.quadraticCurveTo(x - 26, y - 6 + Math.sin(now / 30) * 3, x - 34, y + 2); g.stroke();
  }
}

/* ---------- 防犯カメラ ---------- */
// レジ奥の天井から入口側を映す。店員（あなた）の後ろ頭が手前に入る
const CAM = mk(W, H), cg = CAM.getContext('2d');
const YOU = { who:'あなた', human:false, look:{ h:.96, coat:STORE, pants:'#24282a', skin:'#d8bfa8', hair:'short', hairC:'#1a1816', uniform:true, tag:'研修中', stare:true, feet:'sneaker', shoes:'#e9e7e0', seed:0 } };
const SHADOWMAN = { who:'影', human:false, look:{ h:1.2, coat:'#08090a', pants:'#08090a', skin:'#b9c2bf', hair:'long', hairC:'#050505', stare:true, pale:true, feet:'bare', seed:0 } };
function renderCam(now, o = {}){
  const g = cg; g.save();
  g.drawImage(BG, 0, 0); drawDoor(g, S.door); if (S.peek) drawPeek(g, now); drawLights(g);
  if (aisleOn(now)) drawPerson(g, SHADOWMAN, 250, 345, .38, 1, now, false);
  drawOmens(g, now); drawCreatures(g, now, true);
  const c = o.customer || (o.noCustomer ? null : S.cur);
  if (c && (o.customer || (c.cam && S.pose.a > 0))){
    const p = o.customer ? 1 : ease(S.pose.p), a = o.customer ? 1 : S.pose.a, walking = !o.customer && !!(S.anim && S.anim.kind.startsWith('walk'));
    drawPerson(g, c, 480, lerp(335, 600, p), lerp(.42, 1.12, p), a, now, walking);
    if (c.cam === 'glitch'){ // 宇宙人のまわりだけ映像が崩れる
      for (let i = 0; i < 7; i++){ g.globalAlpha = .9; g.drawImage(NOISE[(Math.floor(now / 40) + i) % 4], (Math.random() - .5) * 40 + 350, 90 + i * 52, 260, 52); }
      g.globalAlpha = 1;
    }
  }
  drawCounter(g, now);
  if (!o.noClerk){
    const bx = 330, by = 560;
    g.fillStyle = hGrad(g, bx - 150, bx + 150, STORE, -.55, -.6); g.beginPath(); g.ellipse(bx, by + 30, 150, 110, 0, Math.PI, 0); g.fill();
    g.fillStyle = shade('#d8bca6', -.4); g.fillRect(bx - 22, by - 112, 44, 42);
    g.fillStyle = shade('#d8bca6', -.25); ell(g, bx - 46, by - 136, 8, 14); ell(g, bx + 46, by - 136, 8, 14);
    const hg = g.createRadialGradient(bx - 14, by - 170, 4, bx, by - 140, 62); hg.addColorStop(0, '#4a4642'); hg.addColorStop(1, '#0e0d0c');
    g.fillStyle = hg; ell(g, bx, by - 142, 47, 56);
  }
  const ghost = (S.cur && S.cur.camExtra && S.phase === 'counter') || now < S.camGhost;
  const ex = o.extra || (ghost ? { c: SHADOWMAN, x: 175, footY: 1010, s: 1.85 } : null);
  if (ex) drawPerson(g, ex.c, ex.x, ex.footY, ex.s, 1, now, false);
  // 白黒化と、監視カメラらしい荒れ
  g.globalCompositeOperation = 'saturation'; g.fillStyle = '#808080'; g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = 'multiply'; g.fillStyle = '#c9ddd0'; g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = 'source-over';
  g.globalAlpha = .1; g.drawImage(NOISE[Math.floor(now / 50) % 4], 0, 0, W, H); g.globalAlpha = 1;
  g.fillStyle = 'rgba(0,0,0,.16)'; for (let y = 0; y < H; y += 3) g.fillRect(0, y, W, 1);
  if (!RM && Math.random() < .04){ const y = Math.random() * H, h = 6 + Math.random() * 30; g.drawImage(CAM, 0, y, W, h, (Math.random() - .5) * 30, y, W, h); }
  g.drawImage(VIG, 0, 0);
  g.font = '20px "DotGothic16", monospace'; g.fillStyle = 'rgba(235,245,240,.92)';
  g.textAlign = 'left'; g.fillText('CAM-02  REGISTER', 24, 38);
  g.textAlign = 'right'; g.fillText(`11/14  ${o.clock || $('clock').textContent}:${String(Math.floor(now / 1000) % 60).padStart(2, '0')}`, W - 24, 38);
  if (Math.floor(now / 600) % 2 === 0){ g.fillText('REC', W - 50, 72); g.fillStyle = '#e04030'; ell(g, W - 36, 65, 8, 8); }
  g.restore();
}
function drawMonitor(now){
  const x = 750, y = 14, w = 194, h = 113;
  ctx.fillStyle = '#050606'; ctx.fillRect(x - 5, y - 5, w + 10, h + 26);
  ctx.drawImage(CAM, x, y, w, h);
  ctx.globalAlpha = .25; ctx.drawImage(NOISE[Math.floor(now / 70) % 4], x, y, w, h); ctx.globalAlpha = 1;
  ctx.font = '11px "DotGothic16", monospace'; ctx.textAlign = 'right'; ctx.fillStyle = '#7f8d85';
  ctx.fillText('［防犯カメラ］で拡大', x + w, y + h + 15);
}
function drawCamView(){ ctx.drawImage(CAM, 0, 0); }
function drawPeek(g, now){ // ドアのガラスの向こうに立つ人影
  const a = Math.sin(clamp((now - S.peek.t0) / 2600, 0, 1) * Math.PI), x = S.peek.x;
  g.save(); g.beginPath(); g.rect(406, 146, 148, 189); g.clip();
  g.fillStyle = `rgba(4,6,6,${.85 * a})`; ell(g, x, 196, 14, 17);
  g.beginPath(); g.moveTo(x - 30, 340); g.quadraticCurveTo(x - 28, 214, x, 212); g.quadraticCurveTo(x + 28, 214, x + 30, 340); g.fill();
  g.fillStyle = `rgba(190,200,195,${.22 * a})`; ell(g, x, 198, 9, 12);
  g.restore();
}

/* ---------- 顔のアップと驚かし ---------- */
// 頭の縦半径が150px、顔の中心が(480,270)になるよう全身を拡大して描く
function drawCloseUp(g, c, now){
  const L = c.look, hr = 150, Hh = hr / (.066 * (L.hs || 1)), top = 270 - hr * (L.stoop ? 1.45 : 1.05);
  const sway = L.sway ? Math.sin(now / 520) * 14 : 0;
  drawPerson(g, c, 480 + sway - (L.stoop ? hr * .3 : 0), top + Hh, Hh / (400 * (L.h || 1)), 1, now, false);
}
function drawFaceView(now){
  const bg = ctx.createRadialGradient(480, 200, 40, 480, 280, 620); bg.addColorStop(0, '#3a4541'); bg.addColorStop(1, '#0d1110');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  if (S.cur && S.phase === 'counter') drawCloseUp(ctx, S.cur, now);
  else if (S.phase === 'animal' && S.ev) drawAnimal(ctx, S.ev, 480, 610, 3.4, now);
  ctx.fillStyle = `rgba(0,0,0,${(1 - S.light) * .5})`; ctx.fillRect(0, 0, W, H);
  ctx.font = '14px "DotGothic16", monospace'; ctx.textAlign = 'left'; ctx.fillStyle = '#d4ddd7'; ctx.fillText('— 顔を、よく見ている —', 20, 34);
}
function scanRed(a){
  ctx.fillStyle = `rgba(160,10,10,${a})`; ctx.fillRect(0, 0, W, H);
  for (let y = 0; y < H; y += 4){ ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(0, y, W, 2); }
}
function drawScareFace(c, k, now){ // その客の顔が、目をくり抜かれた姿で迫ってくる
  const j = RM ? 0 : (Math.random() - .5) * 30, z = 1 + k * .8, hr = 150, fw = hr * (c.look.kid ? .84 : .76);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.translate(480 + j, 270 + j * .5); ctx.scale(z, z); ctx.translate(-480, -270);
  drawCloseUp(ctx, c, now);
  ctx.fillStyle = '#000'; ell(ctx, 480 - fw * .4, 270 - hr * .02, fw * .2, hr * .15); ell(ctx, 480 + fw * .4, 270 - hr * .02, fw * .2, hr * .15);
  ctx.restore();
  scanRed(.3);
}
function drawScare(k, now){
  const sc = S.scare;
  if (sc.kind === 'voice'){ // 非通知の電話：あなたの名前が画面を埋める
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.textAlign = 'center';
    const r = rng(Math.floor(now / 80));
    for (let i = 0, n = 3 + Math.floor(k * 70); i < n; i++){
      ctx.fillStyle = `rgba(${150 + r() * 100 | 0},20,20,${.4 + r() * .6})`; ctx.font = `${16 + r() * 64 | 0}px "Zen Kaku Gothic New", sans-serif`;
      ctx.fillText(S.name, r() * W, r() * H);
    }
    scanRed(.1);
  } else if (sc.kind === 'cam'){ // カメラに映らない客：映像の中で、あなたの真後ろにいる
    renderCam(now, { noCustomer: true, extra: { c: sc.ev, x: 215, footY: 900, s: 1.6 + k * .9 } });
    ctx.drawImage(CAM, 0, 0); if (Math.random() < .4) scanRed(.2);
  } else if (sc.kind === 'animal'){ // 偽物の動物が、目をくり抜かれた顔で迫る
    const z = 3.6 + k * 2.4, j = RM ? 0 : (Math.random() - .5) * 30;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    drawAnimal(ctx, sc.ev, 480 + j, 270 + 100 * z, z, now, { hollow: true }); scanRed(.3);
  } else if (sc.kind === 'blackout' && k < .55){ // 停電。暗闇に目だけが光る
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = `rgba(220,220,200,${.3 + .5 * Math.sin(k * 40) ** 2})`; ell(ctx, 452, 262, 3, 3); ell(ctx, 508, 262, 3, 3);
  } else drawScareFace(sc.ev, sc.kind === 'blackout' ? (k - .55) / .45 : k, now);
}

/* ---------- エンディング映像 ---------- */
function sDrone(dur){ if (!A.c) return; const t = at(); tone(55, t, dur, 'sawtooth', .12, 41); tone(58.3, t, dur, 'sawtooth', .1, 43); noise(t, dur, .05, 300, .5); }
function sVoice(){ if (!A.c) return; const t = at(); for (let i = 0; i < 10; i++) noise(t + i * .12, .15, .18, 600 + Math.random() * 1800, 6); tone(180, t, 1.2, 'square', .04, 90); }
function sDoorLock(){ if (!A.c) return; const t = at(); noise(t, .08, .3, 1200, 2); tone(140, t, .12, 'square', .08); noise(t + .15, .1, .3, 900, 2); }
function storeView(now, dawn){
  ctx.drawImage(BG, 0, 0); drawDoor(ctx, 0);
  if (dawn){ ctx.save(); ctx.beginPath(); ctx.rect(406, 146, 148, 189); ctx.clip(); const dg = ctx.createLinearGradient(0, 146, 0, 335); dg.addColorStop(0, 'rgba(120,140,190,.9)'); dg.addColorStop(1, 'rgba(240,170,110,.9)'); ctx.fillStyle = dg; ctx.fillRect(406, 146, 148, 189); ctx.restore(); }
  drawLights(ctx); drawCounter(ctx, now);
  ctx.fillStyle = dawn ? 'rgba(255,170,100,.07)' : `rgba(0,0,0,${(1 - S.light) * .62})`; ctx.fillRect(0, 0, W, H);
}
function yourFeet(ground, shadowK){ // 自分の足元を見下ろす
  if (ground === 'floor'){
    ctx.fillStyle = '#3a4440'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(0,0,0,.28)'; ctx.lineWidth = 1;
    for (let i = -6; i <= 6; i++){ ctx.beginPath(); ctx.moveTo(480 + i * 118, 0); ctx.lineTo(480 + i * 150, H); ctx.stroke(); }
    for (let y = 30; y < H; y += 34 + y * .12){ ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    const lp = ctx.createRadialGradient(480, 240, 20, 480, 240, 420); lp.addColorStop(0, 'rgba(235,255,245,.2)'); lp.addColorStop(1, 'rgba(235,255,245,0)'); ctx.fillStyle = lp; ctx.fillRect(0, 0, W, H);
  } else {
    ctx.fillStyle = '#3c3a38'; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = .18; ctx.drawImage(NOISE[0], 0, 0, W, H); ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(235,230,215,.55)'; ctx.beginPath(); ctx.moveTo(130, 0); ctx.lineTo(160, 0); ctx.lineTo(120, H); ctx.lineTo(90, H); ctx.fill();
    const sun = ctx.createLinearGradient(0, H, 0, 0); sun.addColorStop(0, 'rgba(255,170,110,.25)'); sun.addColorStop(1, 'rgba(255,170,110,0)'); ctx.fillStyle = sun; ctx.fillRect(0, 0, W, H);
  }
  const xs = [430, 530], shoeY = 300;
  if (shadowK > 0){
    const sg = ctx.createLinearGradient(0, shoeY, 0, 30); sg.addColorStop(0, `rgba(0,0,0,${.55 * shadowK})`); sg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sg; ctx.beginPath(); ctx.moveTo(395, shoeY); ctx.lineTo(565, shoeY); ctx.lineTo(610, 30); ctx.lineTo(350, 30); ctx.closePath(); ctx.fill();
  }
  xs.forEach((x, i) => drawShoe(x, shoeY, 54, Math.PI + (i ? .1 : -.1), YOU.look));
  xs.forEach(x => { ctx.beginPath(); ctx.moveTo(x - 28, shoeY + 18); ctx.lineTo(x + 28, shoeY + 18); ctx.lineTo(x + 42, H + 10); ctx.lineTo(x - 42, H + 10); ctx.closePath(); ctx.fillStyle = hGrad(ctx, x - 45, x + 45, '#24282a', -.5, -.55); ctx.fill(); });
}
function exterior(now, z, showYou){ // 夜明けの店の外観
  ctx.save(); ctx.translate(480, 300); ctx.scale(z, z); ctx.translate(-480, -300);
  const sky = ctx.createLinearGradient(0, 0, 0, 400); sky.addColorStop(0, '#1d2b48'); sky.addColorStop(.6, '#b86e58'); sky.addColorStop(1, '#eab27c');
  ctx.fillStyle = sky; ctx.fillRect(-200, -100, W + 400, 500);
  ctx.fillStyle = '#2b2d30'; ctx.fillRect(-200, 400, W + 400, 300);
  ctx.fillStyle = 'rgba(230,230,220,.45)';
  for (let x = -60; x < W + 100; x += 150){ ctx.beginPath(); ctx.moveTo(x, H + 20); ctx.lineTo(x + 8, H + 20); ctx.lineTo(x + 60, 412); ctx.lineTo(x + 54, 412); ctx.fill(); }
  ctx.fillStyle = '#cfd3cd'; ctx.fillRect(150, 150, 660, 252);
  ctx.fillStyle = STORE; ctx.fillRect(150, 150, 660, 46);
  ctx.fillStyle = '#f4f7f5'; ctx.font = '26px "DotGothic16", monospace'; ctx.textAlign = 'center'; ctx.fillText('OPEN 24H', 480, 182);
  for (const x of [172, 552]){
    const ig = ctx.createLinearGradient(0, 210, 0, 392); ig.addColorStop(0, '#f2fbf6'); ig.addColorStop(1, '#bcd5c9');
    ctx.fillStyle = ig; ctx.fillRect(x, 210, 236, 182);
    ctx.fillStyle = 'rgba(60,80,72,.3)'; for (let r = 0; r < 3; r++) ctx.fillRect(x + 12, 262 + r * 42, 212, 9);
    ctx.strokeStyle = '#8a958f'; ctx.lineWidth = 4; ctx.strokeRect(x, 210, 236, 182);
  }
  ctx.fillStyle = '#e9f6ef'; ctx.fillRect(420, 210, 120, 192);
  if (showYou){ // ガラスの向こうのレジに、あなたが立って手を振っている
    ctx.save(); ctx.beginPath(); ctx.rect(420, 210, 120, 192); ctx.clip();
    ctx.fillStyle = '#9aa7a1'; ctx.fillRect(420, 330, 120, 16);
    drawPerson(ctx, YOU, 480, 470, .62, 1, now, false);
    const G = personGeo(YOU.look, 480, 470, .62, now, false), wave = Math.sin(now / 170) * G.hr * .6;
    const hx2 = 480 + G.sw * 1.5 + wave, hy2 = G.shY - G.hr * 1.3;
    ctx.strokeStyle = STORE; ctx.lineWidth = G.hr * .5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(480 + G.sw * .9, G.shY + G.hr * .4); ctx.lineTo(hx2, hy2 + G.hr * .4); ctx.stroke();
    ctx.fillStyle = YOU.look.skin; ell(ctx, hx2, hy2, G.hr * .3, G.hr * .38);
    ctx.fillStyle = '#7f8c86'; ctx.fillRect(420, 346, 120, 60);
    ctx.restore();
  }
  ctx.strokeStyle = '#8a958f'; ctx.lineWidth = 4; ctx.strokeRect(420, 210, 120, 192); ctx.beginPath(); ctx.moveTo(480, 210); ctx.lineTo(480, 402); ctx.stroke();
  ctx.fillStyle = 'rgba(255,200,150,.12)'; ctx.beginPath(); ctx.moveTo(430, 210); ctx.lineTo(455, 210); ctx.lineTo(425, 402); ctx.lineTo(420, 402); ctx.lineTo(420, 260); ctx.fill();
  ctx.restore();
  ctx.fillStyle = 'rgba(255,160,90,.08)'; ctx.fillRect(0, 0, W, H);
}
function phoneLCD(text, lit){
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#1c201f'; ctx.fillRect(320, 190, 320, 180);
  ctx.fillStyle = lit ? '#9ff0c6' : '#4f9a78'; ctx.fillRect(350, 220, 260, 70);
  ctx.fillStyle = '#0b1a14'; ctx.font = '30px "DotGothic16", monospace'; ctx.textAlign = 'center'; ctx.fillText(text, 480, 266);
  ctx.fillStyle = '#2b302e'; for (let i = 0; i < 9; i++) ctx.fillRect(365 + (i % 3) * 82, 305 + Math.floor(i / 3) * 18, 64, 12);
}
function manualPage(t){ // マニュアルの最後のページに、あなたの字で書き足されている
  ctx.fillStyle = '#ece7d7'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(70,90,130,.22)'; for (let y = 60; y < H; y += 56) ctx.fillRect(0, y, W, 1);
  ctx.fillStyle = 'rgba(196,52,44,.35)'; ctx.fillRect(110, 0, 1, H);
  const lines = ['次の人へ。', 'ルールを守れば、大丈夫。', '——' + S.name];
  let n = Math.max(0, Math.floor((t - 600) / 110));
  ctx.save(); ctx.rotate(-.012); ctx.font = '46px "Zen Kurenaido", "Yu Mincho", serif'; ctx.textAlign = 'left'; ctx.fillStyle = '#1e2226';
  lines.forEach((s, i) => { const shown = RM ? s : s.slice(0, n); n = Math.max(0, n - s.length); ctx.fillText(shown, 150 + (i === 2 ? 300 : 0), 160 + i * 112); });
  ctx.restore();
}
function caption(text, dt){
  const shown = RM ? text : text.slice(0, Math.ceil(text.length * clamp(dt / (text.length * 60), 0, 1)));
  ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, H - 96, W, 64);
  ctx.font = '24px "Zen Kaku Gothic New", sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#ecf7f0'; ctx.fillText(shown, W / 2, H - 54);
}
// 各エンディング：dur(ms)・draw(経過ms)・字幕 [開始, 終了, 文]・効果音 [時刻, 関数]
const CUTS = {
  erosion: { dur: 10000,
    draw(t, now){
      if (t < 2600){ if (Math.random() < .3) S.light = .15 + Math.random() * .3; storeView(now, false); ctx.fillStyle = `rgba(0,0,0,${t / 2600 * .55})`; ctx.fillRect(0, 0, W, H); }
      else if (t < 5600) yourFeet('floor', 0);
      else { renderCam(now, { customer: YOU, noClerk: true }); ctx.drawImage(CAM, 0, 0); }
    },
    caps: [[2700, 4100, '床を見る。'], [4100, 5600, '影が、ない。'], [5800, 9300, 'モニターの中で、わたしはカウンターの外に立っていた。']],
    cues: [[0, () => sDrone(9)], [4100, sThump], [5600, sThump]] },
  fired: { dur: 9600,
    draw(t, now){
      if (t < 5200) phoneLCD(t < 3000 ? '着信　店長' : '通話中　店長', t < 3000 && Math.floor(t / 300) % 2 === 0);
      else if (t < 8000){ const k = (t - 5200) / 2800; renderCam(now, { extra: { c: MANAGER, x: 230, footY: lerp(760, 1100, k), s: lerp(1.3, 2.3, k) } }); ctx.drawImage(CAM, 0, 0); }
      else if (t < 8900) drawScareFace(MANAGER, (t - 8000) / 900, now);
      else { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); }
    },
    caps: [[400, 3000, '翌日。シフトの途中で、店の電話が鳴った。'], [3100, 5200, '「お客様から苦情が三件。悪いけど、今日で終わりにしよう」'], [5300, 8000, '……その声は、真後ろから聞こえた。']],
    cues: [[0, sRing], [1300, sRing], [2600, sRing], [5200, () => sDrone(3)], [8000, sScare]] },
  swap: { dur: 9600,
    draw(t, now){ exterior(now, t < 3500 ? 1 : lerp(1, 2.1, ease(clamp((t - 3500) / 3500, 0, 1))), t >= 3500); },
    caps: [[500, 3500, '自動ドアは、チャイムを鳴らさなかった。'], [3700, 6000, '朝日の中で、振り返る。'], [6000, 9000, 'レジに立っているのは——{name}だった。']],
    cues: [[3500, () => sDrone(5)], [6000, sThump]] },
  true: { dur: 11500,
    draw(t, now){ if (t < 3600) storeView(now, true); else manualPage(t - 3600); },
    caps: [[400, 3400, '朝が来た。佐藤さんにレジを任せた。'], [3800, 6200, 'ロッカーの上に、あのマニュアルが置いてあった。'], [8400, 11000, 'あなたはまだ、何も書いていない。']],
    cues: [[8400, sThump]] },
  survive: { dur: 8200,
    draw(t, now){ if (t < 3600) exterior(now, 1, false); else yourFeet('asphalt', S.shadow / 3); },
    caps: [[400, 3500, '朝の光の中を歩いて帰った。'], [3700, 7600, () => S.shadow === 3 ? '足元を見る。影は、ちゃんとある。' : '足元を見る。影は、ちゃんとある。……少しだけ、薄いけれど。']] },
};
function drawCut(now){
  const C = CUTS[S.cut.kind], t = now - S.cut.t0;
  ctx.save(); C.draw(t, now); ctx.restore();
  ctx.drawImage(VIG, 0, 0);
  ctx.globalAlpha = .06; ctx.drawImage(NOISE[Math.floor(now / 50) % 4], 0, 0, W, H); ctx.globalAlpha = 1;
  const cap = C.caps.filter(c => t >= c[0] && t < c[1]).pop();
  if (cap) caption(fmt(typeof cap[2] === 'function' ? cap[2]() : cap[2]), t - cap[0]);
  const f = Math.max(clamp(1 - t / 600, 0, 1), clamp((t - (C.dur - 900)) / 900, 0, 1));
  if (f > 0){ ctx.fillStyle = `rgba(0,0,0,${f})`; ctx.fillRect(0, 0, W, H); }
}
function endCut(){
  if (!S.cut) return;
  const e = ENDINGS[S.cut.kind]; S.cut = null; S.phase = 'end'; mode('none');
  $('endOv').firstElementChild.classList.toggle('bad', e.kind.startsWith('BAD'));
  $('endKind').textContent = e.kind; $('endTitle').textContent = e.title; $('endText').textContent = fmt(e.text);
  // 答え合わせ：見誤った相手の正体を明かす
  const truth = ({ ev, good }) => ev.type === 'phone' ? (good ? '本部からの電話だった' : '出てはいけない電話だった')
    : ev.type === 'animal' ? (good ? '本物の' + ev.who + 'だった' : ev.who + 'ではなかった') : (good ? '人間だった' : '人間ではなかった');
  const act = ({ ev, accept, timeout }) => timeout ? '迷っているうちに時間切れ' : ev.type === 'phone' ? (accept ? '電話に出た' : '出なかった')
    : ev.type === 'animal' ? (accept ? '店に入れた' : '放っておいた') : (accept ? '接客した' : '目を伏せた');
  const miss = S.log.filter(l => l.accept !== l.good);
  $('endStats').innerHTML = `<div>見抜いた判断 ${S.right} / ${S.total}　・　あなたの影 ${Math.max(0, S.shadow)} / 3　・　苦情 ${S.comp} 件</div>`
    + (miss.length ? `<div class="miss">答え合わせ ── 見誤った相手<ul>${miss.map(l => `<li><b>${l.ev.type === 'phone' ? '電話（' + l.ev.display + '）' : l.ev.who}</b>　${truth(l)}（${act(l)}）</li>`).join('')}</ul></div>`
      : '<div class="miss">見誤った相手は、いなかった。</div>');
  $('endOv').hidden = false; $('bRetry').focus({ preventScroll: true });
}

function render(now){
  if (S.cut){ drawCut(now); return; }
  renderCam(now);
  if (S.closeK < 1){
    ctx.drawImage(BG, 0, 0);
    drawDoor(ctx, S.door);
    if (S.peek) drawPeek(ctx, now);
    drawLights(ctx);
    if (aisleOn(now)) drawPerson(ctx, SHADOWMAN, 250, 345, .38, 1, now, false);
    drawOmens(ctx, now); drawCreatures(ctx, now, false);
    const c = S.cur;
    if (c && S.pose.a > 0){
      const walking = !!(S.anim && S.anim.kind.startsWith('walk'));
      const p = ease(S.pose.p), sway = c.look.sway ? Math.sin(now / 520) * 9 : 0, bob = walking ? Math.sin(now / 300) * 4 : 0;
      // 人でないものは、レジ前でじわじわ身を乗り出してくる
      const lean = !c.human && S.phase === 'counter' ? clamp((now - S.counterT0) / 160000, 0, .12) : 0;
      drawPerson(ctx, c, 480 + sway * p, lerp(335, 640, p) + bob + lean * 500, lerp(.42, 1.35, p) * (1 + lean), S.pose.a, now, walking);
    }
    drawCounter(ctx, now);
    const dread = (3 - S.shadow) * .07;
    ctx.fillStyle = `rgba(0,0,0,${(1 - S.light) * .62 + S.idx / NIGHT.length * .14})`; ctx.fillRect(0, 0, W, H);
    if (dread > 0){ ctx.fillStyle = `rgba(60,0,0,${dread})`; ctx.fillRect(0, 0, W, H); }
    drawMonitor(now);
    if (S.toast){
      const k = (now - S.toast.t0) / 1800;
      if (k >= 1) S.toast = null;
      else { ctx.globalAlpha = (1 - k) * (S.toast.faint ? .45 : 1); ctx.font = '20px "DotGothic16", monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#ecf7f0'; ctx.fillText(S.toast.text, S.toast.x, S.toast.y - k * 14); ctx.globalAlpha = 1; }
    }
  }
  if (S.closeK > 0){ ctx.save(); ctx.globalAlpha = S.closeK; ({ face: drawFaceView, cam: drawCamView }[S.lastView] || drawFeet)(now); ctx.restore(); }
  if (S.dark && now < S.dark.t0 + S.dark.dur){ ctx.fillStyle = 'rgba(0,0,0,.96)'; ctx.fillRect(0, 0, W, H); }
  ctx.drawImage(VIG, 0, 0);
  ctx.globalAlpha = .05; ctx.drawImage(NOISE[Math.floor(now / 50) % 4], 0, 0, W, H); ctx.globalAlpha = 1;
  if (S.scare){
    const k = (now - S.scare.t0) / S.scare.dur;
    if (k >= 1) S.scare = null; else drawScare(k, now);
  }
  if (S.flash && now - S.flash.t0 < 90) drawScareFace(SHADOWMAN, .2, now); // 一瞬だけ見える顔
}

/* ---------- 進行 ---------- */
const bAccept = $('bAccept'), bReject = $('bReject'), bNext = $('bNext'), bFace = $('bFace'), bFeet = $('bFeet'), bCam = $('bCam'), bManual = $('bManual'), bTalk = $('bTalk');
let typeTimer = null, typeFull = '';
function typeLine(s){
  clearInterval(typeTimer); typeFull = s; const el = $('line'); el.textContent = '';
  if (!s) return; if (RM){ el.textContent = s; return; }
  let i = 0; typeTimer = setInterval(() => { i++; el.textContent = s.slice(0, i); if (i >= s.length) clearInterval(typeTimer); }, 36);
}
$('box').addEventListener('click', () => { clearInterval(typeTimer); $('line').textContent = typeFull; });
function say(who, desc, line, items){
  $('who').textContent = who || ''; $('desc').textContent = desc || ''; typeLine(line || '');
  $('items').textContent = items && items.length ? '商品：' + items.join(' ／ ') : '';
}
function hud(){
  $('shadowPips').innerHTML = [0, 1, 2].map(i => `<span class="${i < S.shadow ? '' : 'off'}"></span>`).join('');
  $('compPips').innerHTML = [0, 1, 2].map(i => `<span class="${i < S.comp ? 'on' : ''}"></span>`).join('');
}
function mode(m, ev){
  const dec = m === 'decide';
  bAccept.hidden = bReject.hidden = !dec; bNext.hidden = m !== 'next';
  if (dec){
    bAccept.textContent = ev.accept || (ev.type === 'phone' ? '電話に出る' : '接客する');
    bReject.textContent = ev.reject || (ev.type === 'phone' ? '出ない' : '目を伏せる');
    bAccept.insertAdjacentHTML('beforeend', '<kbd>1</kbd>'); bReject.insertAdjacentHTML('beforeend', '<kbd>2</kbd>');
  }
  bFeet.disabled = S.phase !== 'counter';
  bTalk.disabled = S.phase !== 'counter' || S.talkN >= ASK.length;
  bFace.disabled = S.phase !== 'counter' && S.phase !== 'animal';
  bCam.disabled = ['title', 'end', 'cut'].includes(S.phase);
  bManual.disabled = S.phase === 'end' || S.phase === 'cut';
  setView(null);
}
function setView(v){
  S.view = v; if (v) S.lastView = v;
  bFeet.classList.toggle('on', v === 'feet'); bFeet.firstChild.textContent = v === 'feet' ? '顔を上げる' : '身を乗り出す';
  bFace.classList.toggle('on', v === 'face'); bFace.firstChild.textContent = v === 'face' ? '離れる' : '顔を見る';
  bCam.classList.toggle('on', v === 'cam'); bCam.firstChild.textContent = v === 'cam' ? 'カメラを閉じる' : '防犯カメラ';
}
// 話しかける。二回目は同じことを聞き直して、答えが変わるかを見る
function talkTo(){
  if (S.phase !== 'counter' || S.talkN >= ASK.length) return;
  const ev = S.ev, n = S.talkN++, t = ev.talk || TALK[ev.who] || (ev.human ? TALK_HUMAN : TALK_GHOST);
  S.lineSeq++; sClick();
  say(ev.who, 'あなた「' + ASK[n] + '」', fmt(t[n]), ev.items);
  if (S.timer) S.timer.t0 = Math.min(performance.now(), S.timer.t0 + 2500); // 聞いている間は、少しだけ待ってくれる
  bTalk.disabled = S.talkN >= ASK.length;
}
// 顔・足元・カメラを見たとき、客が気づいて何か言うことがある
function react(v){
  const ev = S.ev;
  if (S.phase !== 'counter' || !ev || S.reacted[v]) return;
  S.reacted[v] = true;
  const caught = v === 'feet' ? !ev.shadow : v === 'cam' ? ev.cam !== true : !ev.human;
  const pick = a => a[Math.floor(Math.random() * a.length)];
  let line = ev.react && ev.react[v];
  if (!line && !ev.human && caught && Math.random() < (v === 'face' ? .4 : .6)) line = pick(REACT_GHOST[v]);
  else if (!line && ev.human && Math.random() < .3) line = pick(REACT_HUMAN[v]);
  if (!line) return;
  const seq = ++S.lineSeq;
  setTimeout(() => {
    if (S.ev !== ev || S.phase !== 'counter' || S.lineSeq !== seq) return;
    $('desc').textContent = fmt(ev.desc); typeLine(fmt(line));
    if (!ev.human) sWhisper(0);
  }, 900);
}
function toast(text, x, y, faint){ S.toast = { text, x: x || 480, y: y || 172, t0: performance.now(), faint }; }
function startTimer(ms){ S.timer = { t0: performance.now(), dur: ms }; }
function stopTimer(){ S.timer = null; $('timer').style.transform = 'scaleX(0)'; $('timerWrap').classList.remove('low'); }

function startGame(){
  S.name = $('nameIn').value.trim() || 'ミナミ';
  NIGHT = buildNight();
  Object.assign(S, { idx:-1, shadow:3, comp:0, right:0, total:0, log:[], red:false, pendingEnd:null, cur:null, ev:null, scare:null, door:0, doorT:0, peek:null, cut:null, view:null, dark:null, aisle:null, flash:null, camGhost:0, omenNext:0, omenArmed:false, flashes:0, pet:null, petHiss:0, animalAt:false, ufo:null, crow:null, moths:null, rat:null });
  $('redRule').hidden = true; bManual.classList.remove('glow');
  hud(); audioInit(); next();
  if (navigator.wakeLock) navigator.wakeLock.request('screen').catch(() => {}); // プレイ中は画面を消さない
}
function next(){
  stopTimer(); S.ringing = false; S.phoneDisplay = ''; S.cur = null; S.ev = null; S.anim = null; S.doorT = 0; S.animalAt = false;
  S.talkN = 0; S.reacted = {}; S.lineSeq++;
  if (S.pendingEnd) return ending(S.pendingEnd);
  const ev = NIGHT[++S.idx];
  if (!ev) return ending(S.shadow === 3 && S.comp === 0 ? 'true' : 'survive');
  S.ev = ev; $('clock').textContent = ev.t;
  if (ev.type === 'narr'){
    S.phase = 'narr';
    if (ev.red){ S.red = true; $('redRule').hidden = false; bManual.classList.add('glow'); sPaper(); }
    say(ev.who, '', fmt(ev.text)); mode('next');
  } else if (ev.type === 'phone'){
    S.phase = 'phone'; S.ringing = true; S.nextRing = 0; S.phoneDisplay = ev.display;
    say('店の電話', '着信表示：' + ev.display, 'プルルルル……　プルルルル……'); mode('decide', ev);
    toast('プルルルル……', 130, 400); startTimer(11000);
  } else if (ev.type === 'animal'){
    S.phase = 'animal'; S.animalAt = true;
    if (!ev.fake) (ev.animal === 'cat' ? sMeow : sBark)();
    say(ev.who, fmt(ev.desc), fmt(ev.line)); mode('decide', ev); startTimer(16000);
  } else {
    S.cur = ev; S.phase = 'enter'; say('', '', ''); mode('none');
    if (ev.chime || ev.walk){ // walk: ドアは開いて歩いてくるが、チャイムは鳴らない
      S.doorT = 1; if (ev.chime){ sChime(); toast('♪ ピンポーン'); }
      S.pose = { p:0, a:1 }; S.anim = { t0: performance.now(), dur: 2300, kind: 'walkin', done: arrive };
    }
    else { S.pose = { p:1, a:0 }; S.anim = { t0: performance.now(), dur: 2000, kind: 'fadein', done: arrive }; }
  }
}
function arrive(){
  S.doorT = 0; S.phase = 'counter'; S.counterT0 = performance.now();
  // 店に入れた動物は、人でないものに威嚇する（たまに外れる）
  if (S.pet && Math.random() < (S.ev.human ? .1 : .85)){
    S.petHiss = performance.now() + 2500; (S.pet === 'cat' ? sHiss : sGrowl)(); toast(S.pet === 'cat' ? 'シャーッ！' : 'ウゥゥ……', 300, 300);
  }
  if (S.ev.alien) sUFO();
  const ev = S.ev; say(ev.who, fmt(ev.desc), fmt(ev.line), ev.items);
  mode('decide', ev); startTimer(ev.final ? 24000 : 20000);
}
function decide(accept, timeout){
  if (!['counter', 'phone', 'animal'].includes(S.phase)) return;
  const ev = S.ev, good = ev.type === 'phone' ? ev.caller === 'honbu' : ev.type === 'animal' ? !ev.fake : ev.human;
  stopTimer(); S.ringing = false; S.total++; S.lineSeq++;
  S.log.push({ ev, good, accept, timeout });
  if (accept === good) S.right++;
  else if (accept){
    S.shadow--;
    const kind = ev.type === 'phone' ? 'voice' : ev.type === 'animal' ? 'animal' : ev.scare || 'face';
    const dur = RM ? 600 : { blackout:1900, voice:1500, cam:1600 }[kind] || 1100;
    S.scare = { t0: performance.now(), dur, kind, ev };
    if (navigator.vibrate) navigator.vibrate([90, 40, 180]); // スマホは驚かしで震える
    if (kind === 'voice') sVoice(); else if (kind === 'blackout'){ sDoorLock(); setTimeout(sScare, dur * .55); } else sScare();
  }
  else if (ev.type !== 'animal') S.comp++; // 本物の動物を追い返しても苦情は来ない
  let text = fmt(accept ? ev.aText : ev.rText);
  if (timeout) text = '（迷っているうちに、時間が過ぎた）\n' + text;
  S.phase = 'result';
  if (ev.type === 'phone') S.phoneDisplay = '';
  else if (ev.type === 'animal'){ if (accept){ S.animalAt = false; if (good){ S.pet = ev.animal; sChime(); } } }
  else if (good){ S.doorT = 1; setTimeout(sChime, 900); S.anim = { t0: performance.now(), dur: 2200, kind: 'walkout', done(){ S.doorT = 0; } }; }
  else S.anim = { t0: performance.now(), dur: 1600, kind: 'fadeout', done(){} };
  say(ev.type === 'phone' ? '店の電話' : ev.who, '', text); $('items').textContent = '';
  if (S.shadow <= 0) S.pendingEnd = 'erosion';
  else if (S.comp >= 3) S.pendingEnd = 'fired';
  else if (ev.final === 'fake' && accept) S.pendingEnd = 'swap';
  else if (ev.final === 'real') S.pendingEnd = S.shadow === 3 && S.comp === 0 ? 'true' : 'survive';
  hud(); mode('next'); bNext.focus({ preventScroll: true });
}
function ending(k){ // エンディング映像を流し、終わったら endCut() が結果画面を出す
  stopTimer();
  Object.assign(S, { ringing:false, phoneDisplay:'', cur:null, anim:null, scare:null, phase:'cut', cut:{ kind:k, t0:performance.now(), cues:new Set() } });
  mode('none'); say(ENDINGS[k].kind, 'クリックかEnterでスキップ', '');
}

/* ---------- 毎フレーム ---------- */
function update(now){
  S.door += (S.doorT - S.door) * .08;
  const closeT = S.view ? 1 : 0;
  S.closeK += (closeT - S.closeK) * .18; if (Math.abs(S.closeK - closeT) < .01) S.closeK = closeT;
  if (S.anim){
    const k = clamp((now - S.anim.t0) / S.anim.dur, 0, 1), kind = S.anim.kind;
    if (kind === 'walkin') S.pose.p = k;
    else if (kind === 'walkout') S.pose.p = 1 - k;
    else if (kind === 'fadein') S.pose.a = k;
    else if (kind === 'fadeout') S.pose.a = 1 - k;
    if (k >= 1){ const d = S.anim.done; S.anim = null; d(); }
  }
  const anomaly = S.cur && !S.cur.human && S.pose.a > 0;
  const rate = RM ? .002 : (anomaly ? .035 : .006) + (3 - S.shadow) * .006;
  if (Math.random() < rate) S.light = .25 + Math.random() * .45; else S.light += (1 - S.light) * .12;
  if (S.dark && now < S.dark.t0 + S.dark.dur) S.light = 0;
  if (A.hum) A.hum.gain.value = .05 * (.5 + .5 * S.light);
  if (S.ringing && now > S.nextRing){ sRing(); S.nextRing = now + 2600; }
  if (S.cut){
    const C = CUTS[S.cut.kind], t = now - S.cut.t0;
    (C.cues || []).forEach(([ms, fn], i) => { if (t >= ms && !S.cut.cues.has(i)){ S.cut.cues.add(i); fn(); } });
    if (t > C.dur) endCut();
  }
  // 3時を過ぎるか影が欠けると、ドアの外に人影が立つようになる
  if (S.peek && now - S.peek.t0 > 2600) S.peek = null;
  else if (!S.peek && (S.red || S.shadow < 3) && ['counter', 'narr', 'result'].includes(S.phase) && Math.random() < .0009) S.peek = { t0: now, x: 432 + Math.random() * 96 };
  if (S.shadow === 1 && S.phase === 'counter' && now - S.lastThump > 1500){ S.lastThump = now; sThump(); }
  if (['counter', 'narr', 'result', 'enter', 'phone'].includes(S.phase) && !S.scare && now > S.omenNext){
    const prog = S.idx / Math.max(1, NIGHT.length);
    S.omenNext = now + (RM ? 30000 : lerp(22000, 8000, prog) - (3 - S.shadow) * 1500) * (.6 + Math.random() * .8);
    if (S.omenArmed) omen(now);
    S.omenArmed = true;
  }
  if (S.timer){
    const k = 1 - (now - S.timer.t0) / S.timer.dur;
    $('timer').style.transform = `scaleX(${Math.max(0, k)})`;
    $('timerWrap').classList.toggle('low', k < .3);
    if (k < .3 && now - S.lastThump > 760){ S.lastThump = now; sThump(); }
    if (k <= 0) decide(false, true);
  }
}
function frame(now){ update(now); render(now); requestAnimationFrame(frame); }
requestAnimationFrame(frame);

/* ---------- 操作 ---------- */
const manualOv = $('manualOv');
function openManual(){ manualOv.hidden = false; bManual.classList.remove('glow'); sPaper(); $('bManClose').textContent = S.phase === 'title' ? 'シフトに入る' : '閉じる'; $('bManClose').focus({ preventScroll: true }); }
function closeManual(){ manualOv.hidden = true; if (S.phase === 'title') startGame(); }
$('bStart').onclick = () => { audioInit(); $('titleOv').hidden = true; openManual(); };
$('bManClose').onclick = closeManual;
manualOv.addEventListener('click', e => { if (e.target === manualOv) closeManual(); });
bManual.onclick = openManual;
bAccept.onclick = () => decide(true, false);
bReject.onclick = () => decide(false, false);
bNext.onclick = next;
bFeet.onclick = () => { if (S.phase === 'counter'){ setView(S.view === 'feet' ? null : 'feet'); sClick(); if (S.view) react('feet'); } };
bFace.onclick = () => { if (!bFace.disabled){ setView(S.view === 'face' ? null : 'face'); sClick(); if (S.view) react('face'); } };
bCam.onclick = () => { if (!bCam.disabled){ setView(S.view === 'cam' ? null : 'cam'); sClick(); if (S.view) react('cam'); } };
bTalk.onclick = talkTo;
cv.addEventListener('click', () => { if (S.cut && performance.now() - S.cut.t0 > 500) endCut(); });
$('bRetry').onclick = () => { $('endOv').hidden = true; S.phase = 'title'; mode('none'); $('clock').textContent = '00:00'; say('', '', ''); $('titleOv').hidden = false; };
$('mute').onclick = () => { A.muted = !A.muted; if (A.m) A.m.gain.value = A.muted ? 0 : .9; $('mute').textContent = A.muted ? '音 OFF' : '音 ON'; };
addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT'){ if (e.key === 'Enter') $('bStart').click(); return; }
  const k = e.key.toLowerCase();
  if (S.cut){ if (k === 'enter' || k === ' ' || k === 'escape'){ e.preventDefault(); endCut(); } return; }
  if (!manualOv.hidden){ if (k === 'escape' || k === 'm') closeManual(); return; }
  if (!$('endOv').hidden || !$('titleOv').hidden) return;
  if (k === '1' && !bAccept.hidden) bAccept.click();
  else if (k === '2' && !bReject.hidden) bReject.click();
  else if (k === 'f' && !bFeet.disabled) bFeet.click();
  else if (k === 'v' && !bFace.disabled) bFace.click();
  else if (k === 'c' && !bCam.disabled) bCam.click();
  else if (k === 't' && !bTalk.disabled) bTalk.click();
  else if (k === 'm' && !bManual.disabled) bManual.click();
  else if ((k === 'enter' || k === ' ') && !bNext.hidden && document.activeElement !== bNext){ e.preventDefault(); bNext.click(); }
});
const fsBtn = $('fs'); // PC版だけにある全画面ボタン
if (fsBtn) fsBtn.onclick = () => {
  if (document.fullscreenElement) document.exitFullscreen();
  else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
};
hud(); mode('none');
})();
