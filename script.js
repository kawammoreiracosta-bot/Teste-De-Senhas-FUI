
/* =========================================
   CONFIGURAÇÕES GERAIS
========================================= */

var COMMON = [
    "123456",
    "password",
    "senha",
    "qwerty",
    "abc123",
    "gato123",
    "12345678",
    "111111",
    "admin",
    "senha123"
];

/* Taxa de tentativas por segundo: medida pela Hive Systems (2026) contra bcrypt
   de custo 10, em duas máquinas de 8 placas RTX 5090 alugadas (138.675 H/s).
   Fonte: Neskey, C. Are your passwords in the green. Hive Systems, 2026.
   https://www.hivesystems.com/blog/are-your-passwords-in-the-green */
var RATE_HASH = 138675;

var $ = function (id) {
    return document.getElementById(id);
};


/* =========================================
   CÁLCULO DO TEMPO DE QUEBRA DA SENHA
========================================= */

function plural(n, um, varios) {
    return n.toLocaleString("pt-BR") + " " + (n === 1 ? um : varios);
}

/* Converte segundos em texto legível (usado no estimador e no infográfico). */
function fmtTempo(s) {
    if (!isFinite(s)) return "tempo astronômico";
    if (s < 1) return "Instantâneo";

    var ano = 365.25 * 86400;
    var faixas = [
        [60, 1, "segundo", "segundos"],
        [3600, 60, "minuto", "minutos"],
        [86400, 3600, "hora", "horas"],
        [ano, 86400, "dia", "dias"]
    ];

    for (var i = 0; i < faixas.length; i++) {
        if (s < faixas[i][0]) {
            return plural(Math.round(s / faixas[i][1]), faixas[i][2], faixas[i][3]);
        }
    }

    var v = s / ano;

    if (v < 1e3) return plural(Math.round(v), "ano", "anos");
    if (v < 1e6) return Math.round(v / 1e3).toLocaleString("pt-BR") + " mil anos";

    var grandes = [
        [1e9, 1e6, "milhão de anos", "milhões de anos"],
        [1e12, 1e9, "bilhão de anos", "bilhões de anos"],
        [1e15, 1e12, "trilhão de anos", "trilhões de anos"],
        [1e18, 1e15, "quatrilhão de anos", "quatrilhões de anos"]
    ];

    for (var j = 0; j < grandes.length; j++) {
        if (v < grandes[j][0]) {
            return plural(Math.round(v / grandes[j][1]), grandes[j][2], grandes[j][3]);
        }
    }

    if (v >= 1e21) return "mais de 1 sextilhão de anos";

    return plural(Math.round(v / 1e18), "quintilhão de anos", "quintilhões de anos");
}

/* Tamanho do conjunto de caracteres (os mesmos da tabela da Hive Systems):
   26 minúsculas, 26 maiúsculas, 10 algarismos e 8 símbolos (^*%$!&@#). */
function pool(p) {
    var n = 0;

    if (/[a-z]/.test(p)) n += 26;
    if (/[A-Z]/.test(p)) n += 26;
    if (/[0-9]/.test(p)) n += 10;
    if (/[^A-Za-z0-9]/.test(p)) n += 8;

    return n;
}


/* =========================================
   ANÁLISE E FORÇA DA SENHA
========================================= */

function update() {
    /* Limite de 30 caracteres (também garantido por maxlength no HTML,
       mas colar texto por scripts ou extensões poderia ultrapassá-lo). */
    var p = $("pw").value.slice(0, 30);

    var bits = p.length
        ? p.length * Math.log2(pool(p) || 1)
        : 0;

    /* Tempo máximo para testar todas as combinações: N^L / taxa.
       Senhas comuns não seguem esse modelo: caem quase de imediato. */
    var secs = Math.pow(pool(p) || 1, p.length) / RATE_HASH;
    var comum = COMMON.indexOf(p.toLowerCase()) >= 0;

    $("time").textContent = !p
        ? "Digite algo"
        : (comum ? "Instantâneo (senha comum)" : fmtTempo(secs));

    $("count").textContent = p.length + " / 30";

    /* Informa ao gráfico de linhas qual é a senha de teste atual. */
    window.SENHA_ATUAL = {
        len: p.length,
        secs: (!p || COMMON.indexOf(p.toLowerCase()) >= 0) ? 0 : secs,
        comum: COMMON.indexOf(p.toLowerCase()) >= 0
    };
    document.dispatchEvent(new CustomEvent("senha"));

    /* Régua logarítmica: de 1 s (0%) até cerca de 3 x 10^20 anos (100%). */
    var ruler = $("ruler");
    var pos = (!p || COMMON.indexOf(p.toLowerCase()) >= 0)
        ? 0
        : Math.min(100, Math.max(0, Math.log10(Math.max(secs, 1)) / 28 * 100));

    ruler.classList.toggle("empty", !p);
    $("marker").style.left = pos + "%";
    ruler.setAttribute("aria-label", p
        ? "Régua logarítmica do tempo de quebra: " + $("time").textContent
        : "Régua logarítmica do tempo de quebra");

    $("bits").textContent = p
        ? "Cerca de " + bits.toFixed(0) +
          " bits de entropia, com " + p.length + " caracteres."
        : "";

    var c = {
        len: p.length >= 12,
        up: /[A-Z]/.test(p),
        lo: /[a-z]/.test(p),
        dg: /[0-9]/.test(p),
        sy: /[^A-Za-z0-9]/.test(p),
        common: COMMON.indexOf(p.toLowerCase()) >= 0
    };

    var rs = [
        ["12 ou mais caracteres", c.len],
        ["Letra maiúscula", c.up],
        ["Letra minúscula", c.lo],
        ["Número", c.dg],
        ["Símbolo", c.sy],
        ["Não está na lista de senhas comuns", !c.common]
    ];

    $("rules").innerHTML = rs.map(function (r) {
        return '<li class="' + (r[1] ? "ok" : "") + '">' +
            r[0] +
            "</li>";
    }).join("");

    var forte = (
        (c.len && c.up && c.lo && c.dg && c.sy) ||
        p.length >= 20
    ) && !c.common;

    $("verdict").className = "verdict" + (forte ? " ok" : "");

    $("verdict").textContent = forte
        ? "Forte: atende (12 caracteres E maiúscula E minúscula E número E símbolo) OU tem 20 ou mais caracteres, E não é comum."
        : "Fraca: não atende à regra (12 caracteres E maiúscula E minúscula E número E símbolo) OU 20 ou mais caracteres, E não ser comum.";


    /* =========================================
       REPRESENTAÇÃO DOS CARACTERES
       Decimal, binário e hexadecimal
    ========================================= */

    var rows = [];
    var characters = Array.from(p).slice(0, 4);

    characters.forEach(function (caractere) {
        var code = caractere.codePointAt(0);

        var decimal = String(code);

        var binario = code.toString(2).padStart(8, "0");

        var hexadecimal = "0x" +
            code.toString(16).toUpperCase();

        var linha =
            ('"' + caractere + '"').padEnd(13) +
            decimal.padEnd(10) +
            binario.padEnd(13) +
            hexadecimal;

        rows.push(linha);
    });

    var cabecalho =
        "caractere".padEnd(13) +
        "decimal".padEnd(10) +
        "binário".padEnd(13) +
        "hex";

    $("bin").textContent = rows.length
        ? cabecalho + "\n" + rows.join("\n")
        : "Digite uma senha acima.";
}

$("pw").addEventListener("input", update);
update();


/* =========================================
   PALETA DE CORES
========================================= */

var cols = [
    ["Azul-petróleo", "#0B7A75"],
    ["Azul-noite", "#12202F"],
    ["Laranja de alerta", "#B8400C"],
    ["Cinza-gelo", "#EEF2F6"]
];

$("colors").innerHTML = cols.map(function (c) {
    var h = c[1];

    var r = parseInt(h.substr(1, 2), 16);
    var g = parseInt(h.substr(3, 2), 16);
    var b = parseInt(h.substr(5, 2), 16);

    var dark = (r * 299 + g * 587 + b * 114) / 1000 < 140;

    return '<div class="sw" style="background:' + h +
        ';color:' + (dark ? "#fff" : "#12202F") + '">' +
        "<strong>" + c[0] + "</strong>" +
        "<span>" + h + "</span>" +
        "<span>RGB " + r + ", " + g + ", " + b + "</span>" +
        "<span>R = " + ("00000000" + r.toString(2)).slice(-8) + "</span>" +
        "</div>";
}).join("");


/* =========================================
   CÁLCULO DO TAMANHO DE ÁUDIO
========================================= */

function audio() {
    var d = +$("dur").value;
    var h = +$("hz").value;
    var b = +$("bps").value;

    var bytes = d * h * b * 2 / 8;

    $("audio").textContent =
        (bytes / 1048576).toFixed(2).replace(".", ",") + " MB";

    $("audio2").textContent =
        d + " s × " +
        h + " amostras/s × " +
        b + " bits × 2 canais ÷ 8 = " +
        Math.round(bytes).toLocaleString("pt-BR") +
        " bytes.";
}

["dur", "hz", "bps"].forEach(function (i) {
    $(i).addEventListener("input", audio);
});

audio();


/* =========================================
   CÁLCULO DE CUSTOS
========================================= */

function money(v) {
    return "R$ " + v.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function cost() {
    var usd = +$("usd").value;
    var mgr = +$("mgr").value;
    var key = +$("key").value;
    var life = +$("life").value || 1;
    var n = +$("n").value || 1;
    var i = (+$("juros").value) / 100;

    var mgrAno = mgr * 12 * usd;
    var keyBrl = key * usd;
    var dep = keyBrl / life;

    var pmt = i
        ? keyBrl * i / (1 - Math.pow(1 + i, -n))
        : keyBrl / n;

    var tot = pmt * n;

    $("cost").innerHTML =
        "<tr><th>Item</th><th>Valor</th></tr>" +

        "<tr><td>Gerenciador de senhas por ano</td><td>" +
        money(mgrAno) + "</td></tr>" +

        "<tr><td>Chave física à vista</td><td>" +
        money(keyBrl) + "</td></tr>" +

        "<tr><td>Depreciação anual da chave</td><td>" +
        money(dep) + "</td></tr>" +

        "<tr><td>Parcela da chave</td><td>" +
        money(pmt) + " × " + n + "</td></tr>" +

        "<tr><td>Juros pagos no parcelamento</td><td>" +
        money(tot - keyBrl) + "</td></tr>" +

        "<tr><td><strong>Custo no primeiro ano</strong></td><td><strong>" +
        money(mgrAno + tot) +
        "</strong></td></tr>";

    list();
}


/* =========================================
   CHECKLIST DE SEGURANÇA
========================================= */

var items = [
    ["Ativar verificação em duas etapas", "conta", 0, 0],
    ["Trocar senhas repetidas", "hábito", 0, 0],
    ["Atualizar o celular", "dispositivo", 0, 1],
    ["Usar gerenciador de senhas", "conta", "mgr", 0],
    ["Comprar chave física", "dispositivo", "key", 0],
    ["Desconfiar de links recebidos", "hábito", 0, 1]
];

function list() {
    var usd = +$("usd").value;
    var g = $("fgrat").checked;
    var p = $("fpend").checked;

    var rows = items.map(function (x) {
        var c = x[2] === "mgr"
            ? (+$("mgr").value) * 12 * usd
            : x[2] === "key"
                ? (+$("key").value) * usd
                : 0;

        return {
            m: x[0],
            cat: x[1],
            c: Math.round(c * 100) / 100,
            f: x[3]
        };
    }).filter(function (r) {
        return (!g || r.c === 0) && (!p || !r.f);
    });

    $("list").innerHTML =
        "<tr><th>Medida</th><th>Categoria</th><th>Custo anual</th><th>Feito</th></tr>" +

        rows.map(function (r) {
            var slug = r.cat.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

            return "<tr><td>" + r.m +
                '</td><td><span class="tag tag-' + slug + '">' + r.cat + "</span>" +
                "</td><td>" + money(r.c) +
                '</td><td><span class="done ' + (r.f ? "yes" : "no") + '">' +
                (r.f ? "sim" : "não") +
                "</span></td></tr>";
        }).join("");

    if (!rows.length) {
        $("list").innerHTML += '<tr><td colspan="4">Nenhuma medida atende aos filtros marcados. Desmarque um filtro para ver a lista.</td></tr>';
    }

    $("csv").textContent =
        "medida;categoria;custo_anual_brl;feito\n" +

        rows.map(function (r) {
            return [
                r.m,
                r.cat,
                r.c.toFixed(2),
                r.f ? "sim" : "nao"
            ].join(";");
        }).join("\n");
}

["usd", "mgr", "key", "life", "n", "juros"].forEach(function (i) {
    $(i).addEventListener("input", cost);
});

["fgrat", "fpend"].forEach(function (i) {
    $(i).addEventListener("change", list);
});

$("copycsv").addEventListener("click", function () {
    var btn = this;
    var texto = $("csv").textContent;

    function pronto() {
        btn.textContent = "Copiado";
        setTimeout(function () { btn.textContent = "Copiar CSV"; }, 1800);
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(texto).then(pronto, function () {
            btn.textContent = "Selecione e copie";
        });
    } else {
        btn.textContent = "Selecione e copie";
    }
});

cost();


/* =========================================
   INFOGRÁFICO: TEMPO DE QUEBRA DE SENHAS
   Carregado de dados_senha.csv
========================================= */

(function () {
    var select = $("passwordLength");
    var chart = $("passwordChart");
    var note = $("passwordChartNote");

    var data = [];

    var methods = [
        "Apenas Números",
        "Apenas Letras Minúsculas",
        "Maiúsculas e Minúsculas",
        "Letras e Números",
        "Com Símbolos"
    ];


    /* =========================================
       LEITURA DO ARQUIVO CSV
    ========================================= */

    function parseCSV(text) {
        var lines = text
            .replace(/^\uFEFF/, "")
            .trim()
            .split(/\r?\n/);

        return lines.map(function (line) {
            var cells = [];
            var cur = "";
            var quoted = false;

            for (var i = 0; i < line.length; i++) {
                var c = line[i];

                if (c === '"' && line[i + 1] === '"' && quoted) {
                    cur += '"';
                    i++;
                } else if (c === '"') {
                    quoted = !quoted;
                } else if (c === "," && !quoted) {
                    cells.push(cur.trim());
                    cur = "";
                } else {
                    cur += c;
                }
            }

            cells.push(cur.trim());

            return cells;
        });
    }


    /* =========================================
       CONVERSÃO DO TEMPO PARA SEGUNDOS
    ========================================= */

    function seconds(label) {
        var n = Number(String(label || "").trim());

        return isFinite(n) && n > 0 ? n : 0.01;
    }


    /* =========================================
       CARREGAMENTO DOS DADOS
    ========================================= */

    function load(text) {
        var matrix = parseCSV(text);

        if (matrix.length < 2) {
            throw new Error("O CSV não tem linhas de dados.");
        }

        var headers = matrix[0].map(function (h) {
            return h.trim();
        });

        var idx = headers.indexOf("Tamanho");

        var mIdx = methods.map(function (m) {
            return headers.indexOf(m);
        });

        if (idx < 0 || mIdx.some(function (i) {
            return i < 0;
        })) {
            throw new Error("As colunas do CSV não correspondem ao arquivo original.");
        }

        data = matrix.slice(1)
            .filter(function (r) {
                return r[idx];
            })
            .map(function (r) {
                return {
                    length: r[idx].replace(/\D/g, ""),
                    values: mIdx.map(function (i) {
                        return r[i] || "—";
                    })
                };
            });

        select.innerHTML = "";

        data.forEach(function (row, i) {
            var o = document.createElement("option");

            o.value = i;
            o.textContent = row.length + " caracteres";

            select.appendChild(o);
        });

        select.value = Math.min(3, data.length - 1);

        render();

        pinIdx = Number(select.value);
        drawLines();

        note.textContent =
            "Tempo máximo para testar todas as combinações de uma senha aleatória: N^L ÷ 138.675 tentativas por segundo (bcrypt custo 10, taxa medida pela Hive Systems em 2026). Barras em escala logarítmica. Não vale para senhas comuns, repetidas ou já vazadas.";
    }


    /* =========================================
       EXIBIÇÃO DO GRÁFICO
    ========================================= */

    function render() {
        var row = data[Number(select.value)];

        if (!row) return;

        var ts = row.values.map(seconds);

        var logs = ts.map(function (t) {
            return Math.log10(Math.max(t, 0.01));
        });

        var min = Math.min.apply(null, logs);
        var max = Math.max.apply(null, logs);

        chart.innerHTML = "";

        row.values.forEach(function (value, i) {
            var wrap = document.createElement("div");

            var head = document.createElement("div");
            head.className = "password-bar-head";

            var name = document.createElement("span");
            name.className = "password-bar-name";
            name.textContent = methods[i];

            var val = document.createElement("span");
            val.className = "password-bar-value";
            val.textContent = fmtTempo(seconds(value));

            head.appendChild(name);
            head.appendChild(val);

            var track = document.createElement("div");
            track.className = "password-track";

            var fill = document.createElement("div");
            fill.className = "password-fill";

            var width = max === min
                ? 100
                : Math.max(2, ((logs[i] - min) / (max - min)) * 100);

            fill.style.width = width + "%";

            track.appendChild(fill);

            wrap.appendChild(head);
            wrap.appendChild(track);

            chart.appendChild(wrap);
        });
    }

    select.addEventListener("change", render);


    /* =========================================
       GRÁFICO DE LINHAS INTERATIVO
       Mesmos dados do CSV, todos os tamanhos de uma vez.
       Mouse, toque e teclado; legenda liga/desliga séries;
       clique fixa um tamanho e sincroniza com as barras;
       a senha digitada no teste aparece como um losango.
    ========================================= */

    var POOLS = [10, 26, 52, 62, 70];
    var NOMES = ["Só números", "Minúsculas", "Maiúsculas e minúsculas", "Letras e números", "Com símbolos"];
    var ANO = 365.25 * 86400;
    var NS = "http://www.w3.org/2000/svg";

    var lwrap = $("lineWrap");
    var lsvg = $("lineSvg");
    var ltip = $("lineTip");
    var llegend = $("lineLegend");
    var linsight = $("lineInsight");

    var visible = [true, true, true, true, true];
    var hoverIdx = -1;
    var pinIdx = -1;
    var geo = null;
    var intro = true;

    function svgEl(nome, attrs, pai) {
        var e = document.createElementNS(NS, nome);

        Object.keys(attrs || {}).forEach(function (k) {
            e.setAttribute(k, attrs[k]);
        });

        if (pai) pai.appendChild(e);

        return e;
    }

    function fmtVezes(r) {
        if (!isFinite(r)) return "incontáveis vezes";
        if (r < 1000) return Math.round(r).toLocaleString("pt-BR") + " vezes";

        var escalas = [
            [1e3, "mil vezes"],
            [1e6, "milhões de vezes"],
            [1e9, "bilhões de vezes"],
            [1e12, "trilhões de vezes"],
            [1e15, "quatrilhões de vezes"],
            [1e18, "quintilhões de vezes"]
        ];

        var e = escalas[0];

        for (var i = 0; i < escalas.length; i++) {
            if (r >= escalas[i][0]) e = escalas[i];
        }

        var n = r / e[0];

        return n.toLocaleString("pt-BR", { maximumFractionDigits: n < 10 ? 1 : 0 }) + " " + e[1];
    }

    function buildLegend() {
        llegend.innerHTML = "";

        NOMES.forEach(function (nome, i) {
            var b = document.createElement("button");

            b.type = "button";
            b.className = "chip s" + (i + 1);
            b.setAttribute("aria-pressed", "true");
            b.innerHTML = '<span class="dot"></span>' + nome + " <small>(" + POOLS[i] + ")</small>";

            b.addEventListener("click", function () {
                var ligadas = visible.filter(Boolean).length;

                if (visible[i] && ligadas === 1) return;

                visible[i] = !visible[i];
                b.setAttribute("aria-pressed", String(visible[i]));
                drawLines();
            });

            llegend.appendChild(b);
        });
    }

    function drawLines() {
        if (!data.length) return;

        var W = Math.max(300, lwrap.clientWidth);
        var small = W < 520;
        var H = small ? 340 : 430;
        var m = { l: small ? 60 : 92, r: small ? 16 : 24, t: 16, b: 46 };
        var pw = W - m.l - m.r;
        var ph = H - m.t - m.b;
        var n = data.length;
        var YMIN = -1.3;
        var YMAX = 28.6;
        var lens = data.map(function (r) { return Number(r.length); });

        function X(i) { return m.l + (n > 1 ? i * pw / (n - 1) : pw / 2); }
        function Y(secs) {
            var v = Math.log10(Math.max(secs, 0.05));
            return m.t + (YMAX - v) / (YMAX - YMIN) * ph;
        }
        function idxDoTamanho(len) {
            for (var i = 0; i < n - 1; i++) {
                if (len >= lens[i] && len <= lens[i + 1]) {
                    return i + (len - lens[i]) / (lens[i + 1] - lens[i]);
                }
            }
            return -1;
        }

        geo = { W: W, H: H, m: m, X: X, Y: Y, n: n, pw: pw, ph: ph };

        lsvg.setAttribute("viewBox", "0 0 " + W + " " + H);
        lsvg.setAttribute("width", W);
        lsvg.setAttribute("height", H);

        while (lsvg.firstChild) lsvg.removeChild(lsvg.firstChild);

        /* eixo vertical: marcos de tempo */
        var marcos = [
            [1, "1 s"], [60, "1 min"], [3600, "1 hora"], [86400, "1 dia"], [ANO, "1 ano"],
            [1e3 * ANO, "mil anos"],
            [1e6 * ANO, small ? "1 mi" : "1 milhão"],
            [1e9 * ANO, small ? "1 bi" : "1 bilhão"],
            [1e12 * ANO, small ? "1 tri" : "1 trilhão"],
            [1e15 * ANO, small ? "1 quatri" : "1 quatrilhão"],
            [1e18 * ANO, small ? "1 quint" : "1 quintilhão"]
        ];

        marcos.forEach(function (mc) {
            if (small && (mc[0] === 60 || mc[0] === 86400)) return;

            var y = Y(mc[0]);

            svgEl("line", { x1: m.l, x2: W - m.r, y1: y, y2: y, "class": "grid-line" }, lsvg);

            var t = svgEl("text", { x: m.l - 8, y: y, dy: "0.33em", "text-anchor": "end", "class": "axis-text" }, lsvg);
            t.textContent = mc[1];
        });

        /* eixo horizontal */
        data.forEach(function (row, i) {
            var t = svgEl("text", { x: X(i), y: H - m.b + 18, "text-anchor": "middle", "class": "axis-text" }, lsvg);
            t.textContent = row.length;
        });

        var tit = svgEl("text", { x: m.l + pw / 2, y: H - 6, "class": "axis-title" }, lsvg);
        tit.textContent = "Tamanho da senha (caracteres)";

        /* faixa e linhas-guia da coluna ativa */
        var step = n > 1 ? pw / (n - 1) : pw;

        svgEl("rect", { "class": "band", x: 0, y: m.t, width: step, height: ph, visibility: "hidden" }, lsvg);
        svgEl("line", { "class": "pin", y1: m.t, y2: m.t + ph, visibility: "hidden" }, lsvg);
        svgEl("line", { "class": "guide", y1: m.t, y2: m.t + ph, visibility: "hidden" }, lsvg);

        /* séries */
        for (var s = 0; s < NOMES.length; s++) {
            var g = svgEl("g", { "class": "series s" + (s + 1) + (visible[s] ? "" : " off") }, lsvg);
            var pts = [];

            data.forEach(function (row, i) {
                pts.push(X(i).toFixed(1) + "," + Y(seconds(row.values[s])).toFixed(1));
            });

            svgEl("polyline", { "class": "line", points: pts.join(" "), pathLength: 1 }, g);

            data.forEach(function (row, i) {
                svgEl("circle", {
                    "class": "pt", "data-col": i,
                    cx: X(i).toFixed(1), cy: Y(seconds(row.values[s])).toFixed(1), r: small ? 3.5 : 4.5
                }, g);
            });
        }

        /* a senha digitada no teste */
        var atual = window.SENHA_ATUAL;
        var posX = atual && atual.len ? idxDoTamanho(atual.len) : -1;

        if (atual && atual.len && posX >= 0) {
            var secs = atual.comum ? 0 : atual.secs;
            var mx = X(posX);
            var my = Y(secs);
            var mg = svgEl("g", { "class": "mine" }, lsvg);

            svgEl("rect", { x: -6, y: -6, width: 12, height: 12, transform: "translate(" + mx + " " + my + ") rotate(45)" }, mg);

            var lab = svgEl("text", {
                x: mx, y: my - 14,
                "text-anchor": mx > W - 80 ? "end" : "middle"
            }, mg);
            lab.textContent = "Sua senha";
        }

        if (intro) {
            lwrap.classList.add("intro");
            intro = false;
        } else {
            lwrap.classList.remove("intro");
        }

        updateActive();
    }

    function updateActive() {
        if (!geo) return;

        var idx = hoverIdx >= 0 ? hoverIdx : pinIdx;
        var band = lsvg.querySelector(".band");
        var guide = lsvg.querySelector(".guide");
        var pin = lsvg.querySelector(".pin");

        var step = geo.n > 1 ? geo.pw / (geo.n - 1) : geo.pw;

        /* coluna fixada por clique */
        if (pinIdx >= 0) {
            pin.setAttribute("x1", geo.X(pinIdx));
            pin.setAttribute("x2", geo.X(pinIdx));
            pin.setAttribute("visibility", "visible");
        } else {
            pin.setAttribute("visibility", "hidden");
        }

        /* coluna sob o cursor */
        if (hoverIdx >= 0) {
            band.setAttribute("x", geo.X(hoverIdx) - step / 2);
            band.setAttribute("width", step);
            band.setAttribute("visibility", "visible");
            guide.setAttribute("x1", geo.X(hoverIdx));
            guide.setAttribute("x2", geo.X(hoverIdx));
            guide.setAttribute("visibility", "visible");
        } else {
            band.setAttribute("visibility", "hidden");
            guide.setAttribute("visibility", "hidden");
        }

        Array.prototype.forEach.call(lsvg.querySelectorAll(".pt"), function (c) {
            c.classList.toggle("on", Number(c.getAttribute("data-col")) === idx);
        });

        showTip();
        showInsight(idx);
    }

    function valoresDa(idx) {
        var row = data[idx];

        return NOMES.map(function (nome, i) {
            return { i: i, nome: nome, t: seconds(row.values[i]) };
        }).filter(function (v) {
            return visible[v.i];
        });
    }

    function showTip() {
        if (hoverIdx < 0) {
            ltip.hidden = true;
            return;
        }

        var vs = valoresDa(hoverIdx).sort(function (a, b) { return b.t - a.t; });

        ltip.innerHTML = "<strong>" + data[hoverIdx].length + " caracteres</strong>" +
            vs.map(function (v) {
                return '<div class="row s' + (v.i + 1) + '"><span class="dot"></span><span class="nm">' +
                    v.nome + "</span><b>" + fmtTempo(v.t) + "</b></div>";
            }).join("");

        ltip.hidden = false;

        var x = geo.X(hoverIdx);
        var w = ltip.offsetWidth;
        var left = x + 14;

        if (left + w > geo.W) left = x - w - 14;
        if (left < 0) left = 0;

        ltip.style.left = left + "px";
        ltip.style.top = (geo.m.t + 4) + "px";
    }

    function showInsight(idx) {
        if (idx < 0 || !data[idx]) {
            linsight.textContent = "Escolha um tamanho no gráfico para comparar os tipos de senha.";
            return;
        }

        var vs = valoresDa(idx).sort(function (a, b) { return a.t - b.t; });
        var tam = data[idx].length + " caracteres";
        var txt;

        if (vs.length === 1) {
            txt = "Com " + tam + ", " + vs[0].nome.toLowerCase() + " leva " + fmtTempo(vs[0].t) + " para ser quebrada.";
        } else {
            var f = vs[0];
            var l = vs[vs.length - 1];

            txt = "Com " + tam + ", a mais fraca (" + f.nome.toLowerCase() + ") cai em " + fmtTempo(f.t) +
                "; a mais forte (" + l.nome.toLowerCase() + ") leva " + fmtTempo(l.t) +
                ", cerca de " + fmtVezes(l.t / f.t) + " mais tempo.";
        }

        var a = window.SENHA_ATUAL;

        if (a && a.len && (a.len < Number(data[0].length) || a.len > Number(data[data.length - 1].length))) {
            txt += " Sua senha de teste tem " + a.len + " caracteres, fora do intervalo do gráfico.";
        } else if (a && a.len) {
            txt += " O losango mostra onde está a sua senha de teste.";
        }

        linsight.textContent = txt;
    }

    function idxDoEvento(e) {
        var r = lsvg.getBoundingClientRect();
        var x = (e.clientX - r.left) * (geo.W / r.width);
        var passo = geo.n > 1 ? geo.pw / (geo.n - 1) : geo.pw;
        var i = Math.round((x - geo.m.l) / passo);

        return Math.max(0, Math.min(geo.n - 1, i));
    }

    function fixar(idx) {
        pinIdx = idx;
        select.value = String(idx);
        render();
        updateActive();
    }

    lwrap.addEventListener("pointermove", function (e) {
        if (!geo) return;
        hoverIdx = idxDoEvento(e);
        updateActive();
    });

    lwrap.addEventListener("pointerdown", function (e) {
        if (!geo) return;
        hoverIdx = idxDoEvento(e);
        updateActive();
    });

    lwrap.addEventListener("pointerleave", function (e) {
        /* no toque, a dica fica visível até tocar fora do gráfico */
        if (e.pointerType === "touch") return;

        hoverIdx = -1;
        updateActive();
    });

    document.addEventListener("pointerdown", function (e) {
        if (hoverIdx >= 0 && !lwrap.contains(e.target)) {
            hoverIdx = -1;
            updateActive();
        }
    });

    lwrap.addEventListener("click", function (e) {
        if (!geo) return;
        fixar(idxDoEvento(e));
    });

    lwrap.addEventListener("keydown", function (e) {
        if (!geo) return;

        var base = hoverIdx >= 0 ? hoverIdx : (pinIdx >= 0 ? pinIdx : 0);

        if (e.key === "ArrowRight") {
            hoverIdx = Math.min(geo.n - 1, hoverIdx < 0 ? base : base + 1);
        } else if (e.key === "ArrowLeft") {
            hoverIdx = Math.max(0, hoverIdx < 0 ? base : base - 1);
        } else if (e.key === "Enter" || e.key === " ") {
            if (hoverIdx >= 0) fixar(hoverIdx);
        } else if (e.key === "Escape") {
            hoverIdx = -1;
        } else {
            return;
        }

        e.preventDefault();
        updateActive();
    });

    lwrap.addEventListener("blur", function () {
        hoverIdx = -1;
        updateActive();
    });

    /* as barras de cima também fixam o tamanho no gráfico de linhas */
    select.addEventListener("change", function () {
        pinIdx = Number(select.value);
        updateActive();
    });

    document.addEventListener("senha", function () {
        if (data.length) drawLines();
    });

    var redimensionar;

    window.addEventListener("resize", function () {
        clearTimeout(redimensionar);
        redimensionar = setTimeout(drawLines, 120);
    });

    buildLegend();


    /* =========================================
       DADOS DE RESERVA (FALLBACK)
       O site funciona mesmo sem o CSV externo.
    ========================================= */

    /* Se o arquivo não carregar, os mesmos valores são calculados aqui. */
    var fallbackCSV = (function () {
        var pools = [10, 26, 52, 62, 70];
        var linhas = ["Tamanho," + methods.join(",")];

        for (var L = 4; L <= 18; L += 2) {
            linhas.push(L + " caracteres," + pools.map(function (n) {
                return Math.pow(n, L) / RATE_HASH;
            }).join(","));
        }

        return linhas.join("\n");
    })();


    /* =========================================
       BUSCA DO CSV E CARREGAMENTO AUTOMÁTICO
    ========================================= */

    fetch("dados_senha.csv")
        .then(function (r) {
            if (!r.ok) {
                throw new Error("CSV não encontrado");
            }

            return r.text();
        })
        .then(function (csv) {
            try {
                load(csv);
            } catch (e) {
                load(fallbackCSV);
            }
        })
        .catch(function () {
            load(fallbackCSV);
        });

})();
