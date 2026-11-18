// Bullsburg Market School: lessons in the Practice Market that teach everything needed to trade stocks and options —
// how stocks work, bid/ask, order types, valuation (market cap, EPS, P/E), dividends, risk and diversification,
// long-term investing and taxes, short selling and margin, options basics, payoffs, moneyness, time decay,
// implied volatility (IV, expected move, IV crush), the Greeks, strategies and risk management.
// Uses the lesson engine from charts.js (window.TT_school). Ends with Options Quick Math.
(function () {
  'use strict';
  const box = document.getElementById('market-school'), SC = window.TT_school; if (!box || !SC) return;
  const esc = x => String(x == null ? '' : x).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $f = v => '$' + (Math.abs(v) >= 1000 ? Math.round(v).toLocaleString('en-US') : (Math.round(v * 100) / 100).toFixed(Math.abs(v) < 10 && v % 1 ? 2 : 0));
  const yf = v => (v < 0 ? '−$' : '$') + Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: Math.abs(v) < 10 ? 1 : 0 });

  /* ---------- option math (Black-Scholes, pretend) ---------- */
  const N = x => { const t = 1 / (1 + .2316419 * Math.abs(x)), d = .3989423 * Math.exp(-x * x / 2), p = d * t * (.3193815 + t * (-.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return x > 0 ? 1 - p : p; };
  function bs(S, K, T, v, put, r = .04) { if (T <= 0) return Math.max(0, put ? K - S : S - K); const d1 = (Math.log(S / K) + (r + v * v / 2) * T) / (v * Math.sqrt(T)), d2 = d1 - v * Math.sqrt(T);
    return put ? K * Math.exp(-r * T) * N(-d2) - S * N(-d1) : S * N(d1) - K * Math.exp(-r * T) * N(d2); }
  function delta(S, K, T, v, put, r = .04) { const d1 = (Math.log(S / K) + (r + v * v / 2) * T) / (v * Math.sqrt(T)); return put ? N(d1) - 1 : N(d1); }
  const range = (a, b, n) => Array.from({ length: n + 1 }, (_, i) => a + (b - a) * i / n);
  const ticks = (a, b, step, f) => { const t = []; for (let x = Math.ceil(a / step) * step; x <= b + 1e-9; x += step) t.push([x, f(x)]); return t; };
  const pxTicks = (a, b, step) => ticks(a, b, step, x => '$' + x);

  /* ---------- the lessons ---------- */
  const L = [
    { id: 'stock', icon: '🏢', t: 'What a stock really is', key: [['Gold', 'earnings day']],
      chart: () => { const d = SC.build(51, [[0, 40], [24, 43], [25, 48.5], [45, 52], [59, 54]], { vol: i => i === 25 ? 3.5 : 1 }); return { d, vol: true, ov: [{ t: 'mk', i: 25, l: 'Great earnings: price jumps', c: 'up', below: true }] }; },
      body: `<p>A <b>share of stock</b> is a tiny piece of ownership in a company. If a company has 1 million shares and you own 1,000, you own 0.1% of it.</p>
        <p>Companies sell shares to raise money to grow. After that, shares trade between investors on a <b>stock exchange</b> like the NYSE or Nasdaq. The company doesn’t get money when you buy from another investor.</p>
        <p>Prices move because of <b>supply and demand</b>: more buyers than sellers pushes the price up. Over the long run, prices follow what investors expect the company to <b>earn</b> in the future. That’s why earnings reports can make a stock jump or drop in one day.</p>
        <p>You make money two ways: the share price goes up (a <b>capital gain</b>), or the company pays you part of its profit (a <b>dividend</b>).</p>`,
      q: [{ q: 'Owning a share of stock means you…', o: ['Own a small piece of the company', 'Loaned money to the company', 'Work for the company'], a: 0, why: 'A share is ownership. Loaning money to a company is a bond.' },
        { q: 'Over the long run, stock prices mostly follow…', o: ['What the company is expected to earn', 'The weather', 'The CEO’s social media'], a: 0, why: 'Investors pay for future profits, so expectations about earnings drive prices.' },
        { q: 'You buy shares from another investor on an exchange. The company gets…', o: ['None of that money', 'All of it', 'Half of it'], a: 0, why: 'The company only gets money when it first sells shares (like in an IPO).' }] },
    { id: 'spread', icon: '↔️', t: 'Bid, ask and the spread', key: [['Green', 'bid (buyers)'], ['Red', 'ask (sellers)']],
      chart: () => { const pts = range(0, 30, 60), mid = pts.map((x, i) => 50 + Math.sin(i / 7) * .6 + i * .01), w = i => i < 30 ? .05 : .4;
        return { curve: true, h: 260, series: [{ pts: pts.map((x, i) => [x, mid[i] + w(i)]), c: 'down', l: 'Ask: lowest price a seller will take' }, { pts: pts.map((x, i) => [x, mid[i] - w(i)]), c: 'up', l: 'Bid: highest price a buyer will pay' }],
          mk: [{ x: 8, y: mid[16] + .3, l: 'Busy stock: 10¢ spread' }, { x: 24, y: mid[48] + .7, l: 'Thin stock: 80¢ spread' }], yfmt: v => '$' + v.toFixed(2), xticks: ticks(0, 30, 10, x => x + ' min'), xl: 'time' }; },
      body: `<p>Every stock has two prices at any moment. The <b>bid</b> is the highest price a buyer is offering. The <b>ask</b> (or offer) is the lowest price a seller will accept.</p>
        <p>The gap between them is the <b>spread</b>. If you buy at the ask and sell right away at the bid, you lose the spread. It’s a hidden cost of trading.</p>
        <p>Popular stocks with lots of <b>volume</b> are <b>liquid</b>: tons of buyers and sellers, so the spread is tiny (often a penny). Small, rarely traded stocks and many options have <b>wide spreads</b>, which makes them more expensive to trade.</p>`,
      q: [{ q: 'The bid is $20.00 and the ask is $20.10. If you buy with a market order, you’ll likely pay…', o: ['$20.10', '$20.00', '$20.05'], a: 0, why: 'Buyers pay the ask. Sellers receive the bid.' },
        { q: 'A wide bid-ask spread usually means the stock is…', o: ['Thinly traded (not liquid)', 'Very popular', 'About to pay a dividend'], a: 0, why: 'Fewer buyers and sellers means a bigger gap between their prices.' },
        { q: 'The spread is…', o: ['A hidden cost of trading', 'Free money', 'A type of dividend'], a: 0, why: 'Buying at the ask and selling at the bid loses the difference.' }] },
    { id: 'orders', icon: '🧾', t: 'Order types', key: [['Green dashes', 'limit buy'], ['Red dashes', 'stop-loss']],
      chart: () => { const d = SC.build(53, [[0, 52], [12, 48.2], [20, 50.5], [28, 47.9], [40, 53], [52, 51], [59, 46.5]]);
        return { d, ov: [{ t: 'hl', y: 48, c: 'up', dash: true, label: 'Limit buy at $48', left: true }, { t: 'hl', y: 47, c: 'down', dash: true, label: 'Stop-loss at $47' }, { t: 'mk', i: 12, l: 'Limit filled', below: true, c: 'up' }, { t: 'mk', i: 57, l: 'Stop triggered: sell', below: true, c: 'down' }] }; },
      body: `<p>A <b>market order</b> buys or sells right now at the best available price. Fast, but in a fast-moving or thin stock you might get a worse price than you expected (called <b>slippage</b>).</p>
        <p>A <b>limit order</b> sets your price: “Buy only at $48 or less” or “Sell only at $60 or more.” You control the price, but it might never fill.</p>
        <p>A <b>stop order</b> (stop-loss) waits until the price hits a level, then becomes a market order. “If it falls to $47, sell.” It limits losses, but in a sudden drop it can fill below your stop. A <b>stop-limit</b> becomes a limit order instead, so it won’t sell below your limit, but it might not sell at all.</p>
        <p>Orders can last for the day only, or be <b>good ’til canceled</b> (GTC).</p>`,
      q: [{ q: 'You want to buy only if the price drops to $48 or less. Use a…', o: ['Limit order', 'Market order', 'Stop order'], a: 0, why: 'A limit order sets the most you’ll pay.' },
        { q: 'A stop-loss order is mainly used to…', o: ['Limit how much you can lose', 'Guarantee a profit', 'Avoid all fees'], a: 0, why: 'It sells automatically if the price falls to your stop level.' },
        { q: 'The downside of a market order is…', o: ['You might get a worse price than expected', 'It never fills', 'It costs $100'], a: 0, why: 'Market orders fill fast at whatever price is available, called slippage.' }] },
    { id: 'value', icon: '🔎', t: 'Valuing a company: market cap, EPS and P/E', key: [['Bars', 'earnings per share each year']],
      chart: () => ({ curve: true, h: 260, series: [{ pts: [[2021, 1.1], [2022, 1.4], [2023, 1.8], [2024, 2.3], [2025, 2.9]], c: 'up', l: 'Earnings per share (EPS)', w: 3 }], mk: [{ x: 2025, y: 2.9, l: 'EPS $2.90' }], yfmt: v => '$' + v.toFixed(1), xticks: ticks(2021, 2025, 1, x => String(x)), xl: 'year' }),
      body: `<p><b>Market cap</b> = share price × number of shares. It’s what the whole company is worth to the market. A $50 stock with 1 billion shares has a $50 billion market cap. Comparing share prices alone tells you nothing about which company is bigger.</p>
        <p><b>EPS</b> (earnings per share) = company profit ÷ number of shares. Growing EPS is one of the best signs of a healthy company.</p>
        <p>The <b>P/E ratio</b> = price ÷ EPS. A $58 stock with $2.90 EPS has a P/E of 20: investors pay $20 for every $1 of yearly profit. A high P/E means investors expect fast growth (or the stock is pricey). A low P/E can mean a bargain, or a company with problems.</p>
        <p>Companies report earnings every <b>quarter</b>. Stocks often move a lot that day, depending on whether results beat or miss what analysts expected.</p>`,
      q: [{ q: 'A company has 10 million shares at $40 each. Its market cap is…', o: ['$400 million', '$40 million', '$4 billion'], a: 0, why: '10 million × $40 = $400 million.' },
        { q: 'A stock costs $60 and its EPS is $3. Its P/E ratio is…', o: ['20', '180', '3'], a: 0, why: 'P/E = price ÷ earnings per share = 60 ÷ 3 = 20.' },
        { q: 'Stock A costs $500 and stock B costs $20. Which company is bigger?', o: ['You can’t tell without the number of shares', 'Stock A', 'Stock B'], a: 0, why: 'Size is market cap: price times shares. A share price alone doesn’t tell you.' }] },
    { id: 'divs', icon: '💵', t: 'Dividends', key: [['Gold', 'reinvesting dividends'], ['Blue', 'spending them']],
      chart: () => { const yrs = range(0, 30, 30), g = .05, y = .03; return { curve: true, h: 260, series: [{ pts: yrs.map(t => [t, 10000 * Math.pow(1 + g + y, t)]), c: 'gold', l: 'Dividends reinvested' }, { pts: yrs.map(t => [t, 10000 * Math.pow(1 + g, t)]), c: 'blue', l: 'Dividends spent' }],
        yfmt: v => '$' + Math.round(v / 1000) + 'k', xticks: ticks(0, 30, 5, x => x + 'y'), xl: '$10,000 invested, years' }; },
      body: `<p>Many companies share part of their profit with owners as a <b>dividend</b>, often every quarter.</p>
        <p>The <b>dividend yield</b> = yearly dividend ÷ share price. A $50 stock paying $1.50 a year yields 3%. A very high yield can be a warning sign: sometimes the price fell because the business is struggling and the dividend may be cut.</p>
        <p>To get the next dividend, you must own the stock before the <b>ex-dividend date</b>. On that date the share price usually drops by about the dividend amount, so it isn’t free money.</p>
        <p>Using dividends to buy more shares is called <b>reinvesting</b> (a DRIP). Over decades, reinvested dividends can make a huge difference, as the chart shows.</p>`,
      q: [{ q: 'A $40 stock pays $2 a year in dividends. Its yield is…', o: ['5%', '2%', '20%'], a: 0, why: '$2 ÷ $40 = 0.05 = 5%.' },
        { q: 'To receive the next dividend, you must own the stock…', o: ['Before the ex-dividend date', 'After the ex-dividend date', 'For 10 years'], a: 0, why: 'Buyers on or after the ex-dividend date don’t get that payment.' },
        { q: 'An unusually high dividend yield can be a warning because…', o: ['The price may have fallen on bad news, and the dividend might be cut', 'High yields are illegal', 'It means the stock never moves'], a: 0, why: 'Yield rises when the price falls. Check why.' }] },
    { id: 'risk', icon: '🧺', t: 'Risk, volatility and diversification', key: [['Gold', 'one stock'], ['Blue', 'index fund (many stocks)']],
      chart: () => { const a = SC.build(57, [[0, 100], [20, 130], [35, 85], [50, 115], [65, 70], [79, 105]], { sig: .03 }), b = SC.build(58, [[0, 100], [79, 128]], { sig: .008 });
        return { curve: true, h: 260, series: [{ pts: a.map((x, i) => [i, x.c]), c: 'gold', l: 'One stock: wild swings' }, { pts: b.map((x, i) => [i, x.c]), c: 'blue', l: 'Index fund: smoother ride' }], yfmt: v => '$' + Math.round(v), xl: 'months' }; },
      body: `<p><b>Risk</b> in investing means uncertainty: how much the price can swing and how much you could lose. <b>Volatility</b> measures how big the swings are. Higher potential return usually comes with higher risk.</p>
        <p><b>Beta</b> compares a stock’s swings with the whole market. A beta of 1.5 tends to move 50% more than the market, both up and down. A beta of 0.5 moves about half as much.</p>
        <p><b>Diversification</b> means spreading money across many investments so one bad company can’t sink you. Owning five tech stocks isn’t much diversification, because they tend to move together (they’re <b>correlated</b>).</p>
        <p>An <b>index fund</b> or <b>ETF</b> owns hundreds of companies in one purchase, like an S&P 500 fund. Look for a low <b>expense ratio</b> (the yearly fee), like 0.03% to 0.10%.</p>`,
      q: [{ q: 'A stock with a beta of 1.5 tends to…', o: ['Move about 50% more than the market', 'Never move', 'Move opposite the market'], a: 0, why: 'Beta compares a stock’s swings with the market’s. Above 1 means bigger swings.' },
        { q: 'Which is the most diversified?', o: ['An S&P 500 index fund', 'Five tech stocks', 'One stock you love'], a: 0, why: 'An index fund spreads money across about 500 companies in many industries.' },
        { q: 'An expense ratio is…', o: ['A fund’s yearly fee', 'A type of dividend', 'A tax on gains'], a: 0, why: 'Lower fees mean more of the return stays with you.' }] },
    { id: 'longterm', icon: '🌳', t: 'Long-term investing and taxes', key: [['Gold', 'start at 18'], ['Blue', 'start at 28']],
      chart: () => { const pv = (start, age) => { let v = 0, out = []; for (let a = 18; a <= 65; a++) { if (a >= start) v = v * 1.07 + 2400; out.push([a, v]); } return out; };
        return { curve: true, h: 260, series: [{ pts: pv(18), c: 'gold', l: 'Start at 18: $200/month' }, { pts: pv(28), c: 'blue', l: 'Start at 28: $200/month' }], yfmt: v => '$' + Math.round(v / 1000) + 'k', xticks: ticks(20, 65, 5, x => String(x)), xl: 'age, 7% a year' }; },
      body: `<p><b>Compound growth</b> means your earnings earn more earnings. Time is the secret ingredient: starting 10 years earlier can nearly double what you end up with, as the chart shows.</p>
        <p><b>Dollar-cost averaging</b> means investing the same amount on a schedule, like every payday. You automatically buy more shares when prices are low and fewer when they’re high, and you don’t have to guess the perfect time.</p>
        <p>“<b>Time in the market</b> beats timing the market.” Missing just a few of the best days can cut long-term returns a lot, and the best days often come right after the worst.</p>
        <p><b>Taxes:</b> profit from selling is a <b>capital gain</b>. Held over a year, it’s a <b>long-term</b> gain with lower tax rates. A year or less is <b>short-term</b>, taxed like regular income. Accounts like a <b>Roth IRA</b> or <b>401(k)</b> let investments grow with tax advantages.</p>`,
      q: [{ q: 'Investing the same amount every month no matter the price is called…', o: ['Dollar-cost averaging', 'Day trading', 'Short selling'], a: 0, why: 'You buy on a schedule, so you buy more shares when prices are low.' },
        { q: 'You sell a stock you held for 8 months at a profit. That’s a…', o: ['Short-term capital gain', 'Long-term capital gain', 'Dividend'], a: 0, why: 'One year or less is short-term, taxed like regular income.' },
        { q: 'Why does starting to invest young matter so much?', o: ['More years for compound growth', 'Stocks are cheaper for teens', 'There are no taxes before 30'], a: 0, why: 'Compounding needs time. The earlier you start, the more your money can grow.' }] },
    { id: 'short', icon: '⚠️', t: 'Short selling and margin', key: [['Line', 'profit or loss from shorting at $50']],
      chart: () => ({ curve: true, zero: true, fill: true, h: 260, series: [{ pts: range(20, 110, 45).map(x => [x, (50 - x) * 100]), c: 'ink', l: 'Short 100 shares at $50' }], vl: [{ x: 50, l: 'sold at $50' }], yfmt: yf, xticks: pxTicks(20, 110, 20), xl: 'stock price' }),
      body: `<p><b>Short selling</b> is betting a stock will fall. You borrow shares, sell them now, and hope to buy them back cheaper later. If you short at $50 and buy back at $40, you make $10 a share.</p>
        <p>The danger: a stock can only fall to $0, but it can rise forever. So a short seller’s possible loss is <b>unlimited</b>. A <b>short squeeze</b> happens when a shorted stock jumps and short sellers rush to buy back, pushing it even higher.</p>
        <p><b>Margin</b> means borrowing money from your broker to buy more stock. It magnifies gains and losses. If your account value drops too far, you get a <b>margin call</b> and must add money, or the broker sells your stock, often at the worst time.</p>
        <p>Beginners should avoid both. They’re here so you understand the news and the risks.</p>`,
      q: [{ q: 'Why is short selling so risky?', o: ['A stock can rise without limit, so losses are unlimited', 'Shorts always lose', 'It’s illegal'], a: 0, why: 'The most you can make is if the stock goes to $0, but the price can keep climbing.' },
        { q: 'A margin call happens when…', o: ['Your borrowed account falls too far in value', 'A company pays a dividend', 'You place a limit order'], a: 0, why: 'The broker demands more money or sells your holdings.' },
        { q: 'Margin makes your gains and losses…', o: ['Bigger', 'Smaller', 'Disappear'], a: 0, why: 'Borrowed money magnifies results both ways.' }] },
    { id: 'optbasics', icon: '🎟️', t: 'Options basics: calls and puts', key: [['Line', 'profit at expiration for 1 call']],
      chart: () => ({ curve: true, zero: true, fill: true, h: 260, series: [{ pts: range(30, 70, 40).map(x => [x, (Math.max(0, x - 50) - 2.5) * 100]), c: 'ink', l: 'Buy 1 call: $50 strike, $2.50 premium' }], vl: [{ x: 50, l: 'strike' }], mk: [{ x: 52.5, y: 0, l: 'Break-even $52.50', below: true }, { x: 35, y: -250, l: 'Max loss: $250 premium', below: true, c: 'down' }], yfmt: yf, xticks: pxTicks(30, 70, 10), xl: 'stock price at expiration' }),
      body: `<p>An <b>option</b> is a contract that gives the buyer the <b>right, but not the obligation</b>, to buy or sell a stock at a set price (the <b>strike</b>) before a set date (the <b>expiration</b>).</p>
        <p>A <b>call</b> is the right to <b>buy</b>. You buy calls if you think the stock will go <b>up</b>. A <b>put</b> is the right to <b>sell</b>. You buy puts if you think it will go <b>down</b>, or to protect shares you own.</p>
        <p>The price of an option is the <b>premium</b>. One contract covers <b>100 shares</b>, so a $2.50 premium costs $250. When you buy an option, the most you can lose is the premium.</p>
        <p>The <b>seller</b> (writer) collects the premium and takes on the <b>obligation</b>: to sell shares (calls) or buy shares (puts) if the buyer exercises.</p>`,
      q: [{ q: 'A call option gives you the right to…', o: ['Buy shares at the strike price', 'Sell shares at the strike price', 'Receive dividends'], a: 0, why: 'Calls are the right to buy. Puts are the right to sell.' },
        { q: 'An option premium is $3.20. What does one contract cost?', o: ['$320', '$3.20', '$32'], a: 0, why: 'One contract covers 100 shares: $3.20 × 100 = $320.' },
        { q: 'You think a stock will fall. Which option might you buy?', o: ['A put', 'A call', 'Neither, options can’t do that'], a: 0, why: 'A put gains value as the stock drops below the strike.' }] },
    { id: 'payoff', icon: '📐', t: 'Payoffs and break-even', key: [['Gold', 'long put'], ['Blue', 'long call']],
      chart: () => ({ curve: true, zero: true, h: 260, series: [{ pts: range(30, 70, 40).map(x => [x, (Math.max(0, x - 50) - 2) * 100]), c: 'blue', l: 'Call: $50 strike, $2' }, { pts: range(30, 70, 40).map(x => [x, (Math.max(0, 50 - x) - 2) * 100]), c: 'gold', l: 'Put: $50 strike, $2' }],
        vl: [{ x: 50, l: 'strike $50' }], mk: [{ x: 52, y: 0, l: 'Call BE $52', below: true }, { x: 48, y: 0, l: 'Put BE $48' }], yfmt: yf, xticks: pxTicks(30, 70, 10), xl: 'stock price at expiration' }),
      body: `<p>A <b>payoff diagram</b> shows your profit or loss at expiration for every possible stock price. It’s the best way to understand any option trade.</p>
        <p><b>Break-even for a call</b> = strike + premium. A $50 call bought for $2 needs the stock above $52 at expiration to make money.</p>
        <p><b>Break-even for a put</b> = strike − premium. A $50 put bought for $2 needs the stock below $48.</p>
        <p>Notice the shape: buyers have a <b>limited loss</b> (the premium) and a big possible gain. Sellers have the opposite: a limited gain (the premium) and possibly large losses. That’s why selling options without protection is risky.</p>`,
      q: [{ q: 'You buy a $40 call for $1.50. What’s your break-even at expiration?', o: ['$41.50', '$38.50', '$40.00'], a: 0, why: 'Call break-even = strike + premium = 40 + 1.50.' },
        { q: 'You buy a $30 put for $2. What’s your break-even?', o: ['$28', '$32', '$30'], a: 0, why: 'Put break-even = strike − premium = 30 − 2.' },
        { q: 'When you buy an option, your maximum loss is…', o: ['The premium you paid', 'Unlimited', 'The strike price × 100'], a: 0, why: 'If the option expires worthless, you lose what you paid, nothing more.' }] },
    { id: 'money', icon: '🎯', t: 'In, at and out of the money', key: [['Dashes', 'value at expiration (intrinsic)'], ['Gold', 'value today with 60 days left']],
      chart: () => { const xs = range(35, 65, 60); return { curve: true, h: 260, series: [{ pts: xs.map(x => [x, Math.max(0, x - 50)]), c: 'muted', dash: true, l: 'Intrinsic value' }, { pts: xs.map(x => [x, bs(x, 50, 60 / 365, .35)]), c: 'gold', l: 'Option price (intrinsic + extrinsic)' }],
        vl: [{ x: 50, l: 'ATM' }], mk: [{ x: 40, y: bs(40, 50, 60 / 365, .35), l: 'OTM: all extrinsic' }, { x: 60, y: bs(60, 50, 60 / 365, .35), l: 'ITM', below: true }], yfmt: v => '$' + v.toFixed(0), xticks: pxTicks(35, 65, 5), xl: '$50 call, stock price' }; },
      body: `<p><b>Moneyness</b> describes where the stock price is compared with the strike.</p>
        <p>A call is <b>in the money (ITM)</b> when the stock is above the strike, <b>at the money (ATM)</b> when it’s about equal, and <b>out of the money (OTM)</b> when it’s below. For puts it’s the reverse.</p>
        <p>An option’s price has two parts. <b>Intrinsic value</b> is what it would be worth if exercised right now: a $50 call with the stock at $56 has $6 of intrinsic value. <b>Extrinsic value</b> (time value) is everything above that: what people pay for the chance it gets better before expiration.</p>
        <p>OTM options are pure extrinsic value. They’re cheap, but they expire worthless unless the stock moves enough, which is why most cheap “lottery ticket” options lose.</p>`,
      q: [{ q: 'The stock is at $56. A $50 call has how much intrinsic value?', o: ['$6', '$0', '$56'], a: 0, why: 'Intrinsic value = stock − strike = 56 − 50.' },
        { q: 'A $60 call with the stock at $55 is…', o: ['Out of the money', 'In the money', 'At the money'], a: 0, why: 'A call is OTM when the stock is below the strike.' },
        { q: 'A $45 put costs $4 with the stock at $43. How much is extrinsic value?', o: ['$2', '$4', '$0'], a: 0, why: 'Intrinsic = 45 − 43 = $2. The other $2 is extrinsic (time) value.' }] },
    { id: 'theta', icon: '⏳', t: 'Time decay (theta)', key: [['Line', 'price of an at-the-money option as days pass']],
      chart: () => { const ds = range(0, 90, 90); return { curve: true, h: 260, series: [{ pts: ds.map(d => [d, bs(50, 50, Math.max(.0001, 90 - d) / 365, .35)]), c: 'gold', l: '$50 call, stock stays at $50' }],
        mk: [{ x: 30, y: bs(50, 50, 60 / 365, .35), l: 'Slow decay early', below: true }, { x: 84, y: bs(50, 50, 6 / 365, .35), l: 'Fast decay at the end', c: 'down' }], yfmt: v => '$' + v.toFixed(1), xticks: ticks(0, 90, 15, x => 'day ' + x), xl: '90 days until expiration' }; },
      body: `<p>Options are wasting assets: every day, a little extrinsic value disappears. This is <b>time decay</b>, measured by the Greek <b>theta</b>. A theta of −0.05 means the option loses about 5 cents a day (or $5 per contract) if nothing else changes.</p>
        <p>Time decay isn’t steady. It speeds up a lot in the last few weeks before expiration, as the chart shows. That’s bad for option <b>buyers</b> and good for option <b>sellers</b>, who collect that decay.</p>
        <p>This is why buying short-dated options is so hard: you need to be right about the direction <b>and</b> the timing. Buying more time costs more up front, but decays more slowly.</p>`,
      q: [{ q: 'Theta measures…', o: ['How much value an option loses each day from time passing', 'How much it moves with the stock', 'The dividend'], a: 0, why: 'Theta is time decay.' },
        { q: 'When does time decay speed up the most?', o: ['In the last few weeks before expiration', 'Right after you buy', 'It’s always the same'], a: 0, why: 'Extrinsic value melts fastest near expiration.' },
        { q: 'Who benefits from time decay?', o: ['Option sellers', 'Option buyers', 'Nobody'], a: 0, why: 'Sellers collected the premium, and it shrinks each day in their favor.' }] },
    { id: 'iv', icon: '🌪️', t: 'Implied volatility (IV) and IV crush', key: [['Blue', 'IV'], ['Gold', 'price of an at-the-money call']],
      chart: () => { const days = range(0, 30, 30), iv = days.map(d => d < 20 ? .30 + d * .018 : d === 20 ? .66 : .32), price = days.map((d, i) => bs(50 + (d > 20 ? .8 : 0), 50, (45 - d) / 365, iv[i]) * 10);
        return { curve: true, h: 280, series: [{ pts: days.map((d, i) => [d, iv[i] * 100]), c: 'blue', l: 'IV % (rises before earnings)' }, { pts: days.map((d, i) => [d, price[i]]), c: 'gold', l: 'Call price × 10' }],
          vl: [{ x: 20.5, l: 'earnings' }], mk: [{ x: 21, y: 32, l: 'IV crush', below: true, c: 'down' }], yfmt: v => Math.round(v), xticks: ticks(0, 30, 5, x => 'day ' + x) }; },
      body: `<p><b>Implied volatility (IV)</b> is how much the market <i>expects</i> a stock to move, figured out backward from option prices. Higher IV means bigger expected swings, so options cost more.</p>
        <p>IV is a yearly percentage. A handy rule: the <b>expected move</b> ≈ price × IV × √(days ÷ 365). A $100 stock with 30% IV is expected to move about $100 × 0.30 × √(30 ÷ 365) ≈ <b>$8.60</b> in 30 days (up or down, about two-thirds of the time).</p>
        <p><b>Historical volatility</b> is how much it actually moved in the past. <b>IV rank</b> or <b>IV percentile</b> tells you whether today’s IV is high or low compared with the past year.</p>
        <p>IV usually rises before big events like earnings, because nobody knows the result. Right after the news, uncertainty disappears and IV collapses. That’s <b>IV crush</b>: options can lose value even if the stock moved your way, as in the chart. Buyers before earnings need a move bigger than the market expected.</p>
        <p>The Greek <b>vega</b> measures how much an option’s price changes when IV moves 1 point.</p>`,
      q: [{ q: 'High implied volatility makes options…', o: ['More expensive', 'Cheaper', 'Unaffected'], a: 0, why: 'Bigger expected moves mean a bigger chance of a big payoff, so premiums rise.' },
        { q: 'You buy a call before earnings. The stock rises a little, but your call loses value. Why?', o: ['IV crush after the news', 'Dividends', 'The spread closed'], a: 0, why: 'IV collapses after earnings, shrinking extrinsic value faster than the small move helped.' },
        { q: 'A $100 stock has 30% IV. About how much is it expected to move in a year?', o: ['$30', '$3', '$300'], a: 0, why: 'IV is yearly: 30% of $100 = about $30, up or down. For shorter periods, multiply by √(days ÷ 365).' },
        { q: 'The Greek that measures sensitivity to IV is…', o: ['Vega', 'Delta', 'Theta'], a: 0, why: 'Vega: how much the option price changes for a 1-point change in IV.' }] },
    { id: 'greeks', icon: '🔤', t: 'The Greeks', key: [['Line', 'delta of a $50 call']],
      chart: () => { const xs = range(35, 65, 60); return { curve: true, h: 260, series: [{ pts: xs.map(x => [x, delta(x, 50, 45 / 365, .35)]), c: 'blue', l: 'Delta (45 days left)' }, { pts: xs.map(x => [x, delta(x, 50, 5 / 365, .35)]), c: 'gold', l: 'Delta (5 days left)', dash: true }],
        vl: [{ x: 50, l: 'strike' }], mk: [{ x: 50, y: .5, l: 'ATM ≈ 0.50' }], yfmt: v => v.toFixed(1), xticks: pxTicks(35, 65, 5), xl: 'stock price' }; },
      body: `<p>The <b>Greeks</b> measure what makes an option’s price change.</p>
        <p><b>Delta</b>: how much the option moves when the stock moves $1. A 0.50 delta call gains about $0.50 (or $50 per contract) when the stock rises $1. Calls have delta from 0 to 1, puts from 0 to −1. Delta is also a rough guess of the chance the option finishes in the money.</p>
        <p><b>Gamma</b>: how fast delta changes. It’s highest for at-the-money options near expiration, which is why they can swing wildly (see the steep dashed line).</p>
        <p><b>Theta</b>: daily time decay. <b>Vega</b>: sensitivity to implied volatility. <b>Rho</b>: sensitivity to interest rates (usually small).</p>
        <p>Traders use the Greeks to know their real risk: “If the stock drops $2, IV falls 5 points and a week passes, what happens to my position?”</p>`,
      q: [{ q: 'A call has a delta of 0.60. The stock rises $1. The option rises about…', o: ['$0.60 per share', '$1.00 per share', '$6.00 per share'], a: 0, why: 'Delta is how much the option moves per $1 move in the stock.' },
        { q: 'Which Greek measures how fast delta changes?', o: ['Gamma', 'Vega', 'Rho'], a: 0, why: 'Gamma is the rate of change of delta.' },
        { q: 'A put option’s delta is…', o: ['Between 0 and −1', 'Between 0 and 1', 'Always 0'], a: 0, why: 'Puts gain when the stock falls, so their delta is negative.' }] },
    { id: 'strats', icon: '🧠', t: 'Option strategies', key: [['Gold', 'bull call spread'], ['Blue', 'covered call']],
      chart: () => { const xs = range(35, 70, 70); return { curve: true, zero: true, h: 260, series: [{ pts: xs.map(x => [x, (Math.max(0, x - 50) - Math.max(0, x - 55) - 2) * 100]), c: 'gold', l: 'Bull call spread: buy $50, sell $55, $2 net' },
          { pts: xs.map(x => [x, ((x - 50) - Math.max(0, x - 55) + 1.5) * 100]), c: 'blue', l: 'Covered call: own at $50, sell $55 call for $1.50' }], vl: [{ x: 55, l: '$55' }], yfmt: yf, xticks: pxTicks(35, 70, 5), xl: 'stock price at expiration' }; },
      body: `<p>Options can be combined to shape your risk.</p>
        <p><b>Covered call</b>: own 100 shares and sell a call. You collect premium (extra income), but give up gains above the strike. Popular with long-term owners.</p>
        <p><b>Cash-secured put</b>: sell a put while holding enough cash to buy the shares. You get paid while waiting to buy a stock you want at a lower price.</p>
        <p><b>Protective put</b>: own shares and buy a put, like insurance against a big drop.</p>
        <p><b>Vertical spread</b>: buy one option and sell another with a different strike, like a <b>bull call spread</b>. It costs less than a call alone, with both the loss and the gain capped.</p>
        <p><b>Straddle</b>: buy a call and a put at the same strike to bet on a big move in either direction. <b>Iron condor</b>: sell options on both sides to bet the stock stays in a range.</p>
        <p>Selling <b>naked</b> (unprotected) options can lose far more than you collected. Beginners should stick to defined-risk trades.</p>`,
      q: [{ q: 'You own 100 shares and sell a call against them. That’s a…', o: ['Covered call', 'Naked put', 'Straddle'], a: 0, why: 'Your shares “cover” the call you sold.' },
        { q: 'Buying a put to protect shares you own is called a…', o: ['Protective put', 'Bull call spread', 'Margin call'], a: 0, why: 'It works like insurance, gaining if the stock falls.' },
        { q: 'A bull call spread has…', o: ['Limited loss and limited gain', 'Unlimited loss', 'No risk at all'], a: 0, why: 'Selling the higher strike caps your gain but lowers your cost and caps your loss.' }] },
    { id: 'riskmgmt', icon: '🛡️', t: 'Risk management and trading psychology', key: [['Gold', 'risking 2% per trade'], ['Blue', 'risking 30% per trade']],
      chart: () => { let a = 10000, b = 10000; const seq = [0, 0, 0, 0, 1, 0, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1], pa = [[0, a]], pb = [[0, b]];
        seq.forEach((w, i) => { a += w ? a * .04 : -a * .02; b += w ? b * .6 : -b * .3; pa.push([i + 1, a]); pb.push([i + 1, b]); });
        return { curve: true, h: 260, series: [{ pts: pa, c: 'gold', l: 'Risk 2% to make 4%' }, { pts: pb, c: 'blue', l: 'Risk 30% to make 60%' }], yfmt: v => '$' + Math.round(v / 1000) + 'k', xl: 'the same 25 trades (10 wins, 15 losses)' }; },
      body: `<p>Great traders focus on <b>not losing big</b>. Even good strategies have losing streaks, and position size decides whether you survive them. Same wins and losses, very different results, as the chart shows.</p>
        <p><b>Position sizing</b>: many traders risk only 1% to 2% of their account per trade. <b>Risk/reward</b>: aim to make at least twice what you risk. With 1:2, you can be wrong more than half the time and still come out ahead.</p>
        <p>Know the option risks: <b>assignment</b> (if you sold an option, you can be required to buy or sell the shares, sometimes early), <b>liquidity</b> (check volume, open interest and the bid-ask spread) and <b>expiration</b> (most options expire worthless).</p>
        <p>Watch your brain: <b>FOMO</b> (chasing a move you missed), <b>revenge trading</b> (betting bigger to win back a loss) and holding losers while cutting winners. Keep a trading journal and practice with pretend money first, like you’re doing here.</p>`,
      q: [{ q: 'Many professional traders risk about how much of their account on one trade?', o: ['1% to 2%', '25%', '100%'], a: 0, why: 'Small risk per trade lets you survive the losing streaks every strategy has.' },
        { q: 'With a 1:2 risk/reward ratio, you…', o: ['Can win less than half the time and still profit', 'Must win every trade', 'Can’t lose money'], a: 0, why: 'Each win pays twice what each loss costs.' },
        { q: 'You lost money and immediately place a bigger trade to win it back. That’s…', o: ['Revenge trading', 'Diversification', 'Dollar-cost averaging'], a: 0, why: 'Emotional, oversized trades after a loss often make things worse.' }] }];

  /* ---------- Options Quick Math game ---------- */
  let QM = { q: null, streak: 0 };
  const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1)), pr = () => (ri(5, 60) / 10);
  function newQ() { const k = ri(0, 5), K = ri(4, 30) * 5, p = pr(), S0 = K + ri(-8, 8);
    const q = [() => ({ t: 'You buy a $' + K + ' call for $' + p.toFixed(2) + '. What’s your break-even at expiration?', a: K + p, f: v => '$' + v.toFixed(2), why: 'Call break-even = strike + premium.' }),
      () => ({ t: 'You buy a $' + K + ' put for $' + p.toFixed(2) + '. What’s your break-even at expiration?', a: K - p, f: v => '$' + v.toFixed(2), why: 'Put break-even = strike − premium.' }),
      () => ({ t: 'An option’s premium is $' + p.toFixed(2) + '. How much does one contract cost?', a: p * 100, f: v => '$' + Math.round(v).toLocaleString('en-US'), why: 'One contract = 100 shares, so multiply the premium by 100.' }),
      () => ({ t: 'The stock is at $' + S0 + '. What’s the intrinsic value of a $' + K + ' call?', a: Math.max(0, S0 - K), f: v => '$' + v.toFixed(0), why: 'Call intrinsic value = stock − strike, or $0 if that’s negative.' }),
      () => ({ t: 'The stock is at $' + S0 + '. What’s the intrinsic value of a $' + K + ' put?', a: Math.max(0, K - S0), f: v => '$' + v.toFixed(0), why: 'Put intrinsic value = strike − stock, or $0 if that’s negative.' }),
      () => { const P = ri(4, 30) * 10, iv = ri(2, 8) * 10; return { t: 'A $' + P + ' stock has ' + iv + '% implied volatility. About how much is it expected to move in one year?', a: P * iv / 100, f: v => '$' + v.toFixed(0), why: 'Yearly expected move ≈ price × IV.' }; }][k]();
    const wrong = new Set(), right = q.f(q.a), step = Math.max(1, Math.round(Math.abs(q.a) * .15)), cands = [q.a * .85, q.a * 1.15, q.a * .7, q.a * 1.3, q.a + step, q.a - step, q.a + 2 * step, q.a - 2 * step, q.a + 3 * step, q.a + 4 * step, q.a + 5 * step].sort(() => Math.random() - .5);
    for (const c of cands) { if (wrong.size >= 3) break; const s2 = q.f(Math.max(0, c)); if (s2 !== right) wrong.add(s2); }
    q.opts = [...wrong, q.f(q.a)].sort(() => Math.random() - .5); q.right = q.f(q.a); QM.q = q; QM.done = false; }
  function game(el, st) { if (!QM.q) newQ(); const q = QM.q;
    el.innerHTML = '<div class="row" style="justify-content:space-between"><div><div class="eyebrow">Mini game · +10 XP per right answer</div><h3 style="font-size:26px">Options Quick Math</h3></div>' +
      '<div class="scorebar"><div><span>Streak</span><b>' + QM.streak + '</b></div><div><span>Best</span><b>' + (st().best || 0) + '</b></div></div></div><p style="font-weight:700;font-size:18px;margin:10px 0">' + esc(q.t) + '</p>' +
      '<div class="choices cs-ch">' + q.opts.map(o => '<button class="btn ghost" data-qm="' + esc(o) + '">' + esc(o) + '</button>').join('') + '</div><div class="fb" id="qm-fb" aria-live="polite"></div>';
    el.querySelectorAll('[data-qm]').forEach(b => { b.onclick = () => { if (QM.done) return; QM.done = true; const ok = b.dataset.qm === q.right;
      el.querySelectorAll('[data-qm]').forEach(x => { if (x.dataset.qm === q.right) x.classList.add('right'); else if (x === b) x.classList.add('wrong'); });
      if (ok) { QM.streak++; if (QM.streak > (st().best || 0)) st().best = QM.streak; try { addXP(10, b); } catch (e) {} save(); } else QM.streak = 0;
      el.querySelector('#qm-fb').innerHTML = (ok ? '✅ Right! ' : '❌ The answer is <b>' + esc(q.right) + '</b>. ') + esc(q.why) + ' <button class="btn sun" id="qm-next" style="margin-left:6px">Next question</button>';
      el.querySelector('#qm-next').onclick = () => { newQ(); game(el, st); }; }; }); }

  SC.mount(box, { key: 'ms', lessons: L, eyebrow: 'Market School', title: 'Learn stocks and options', blurb: '16 lessons: how stocks work, orders, valuing companies, dividends, risk, long-term investing, then options, implied volatility, the Greeks and strategies.', finish: 'You finished Market School! You know how stocks and options really work.', game });
})();
