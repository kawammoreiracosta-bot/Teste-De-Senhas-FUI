
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
        c[0] + "<br>" +
        h + "<br>" +
        "RGB " + r + ", " + g + ", " + b + "<br>" +
        "R = " + ("00000000" + r.toString(2)).slice(-8) +
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
            return "<tr><td>" + r.m +
                "</td><td>" + r.cat +
                "</td><td>" + money(r.c) +
                "</td><td>" + (r.f ? "sim" : "não") +
                "</td></tr>";
        }).join("");

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
