const cheerio = require('cheerio')
const rp = require('request-promise').defaults({
  jar: true,
  rejectUnauthorized: false,
  followAllRedirects: true,
  resolveWithFullResponse: true,
  headers: {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
    'Cache-Control': 'max-age=0',
    'Connection': 'keep-alive',
    'sec-ch-ua': '"Google Chrome";v="87", " Not;A Brand";v="99", "Chromium";v="87"',
    'sec-ch-ua-mobile': '?0',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.88 Safari/537.36'
  }
})
const qs = require('querystring')
const xlsx = require('xlsx')

const mainUrl = 'https://approweb.intranet.pajak.go.id'
const loginUrl = 'https://approweb.intranet.pajak.go.id/index.php?r=site/index'
const listUnit = [2,3,4,424071500]

let apprCSRF

const getApprCSRF = body => {
  const $ = cheerio.load(body)
  const apprCSRF = $('[name="apprCSRF"]').get(0)
  return apprCSRF?.attribs?.value
}

const parseNumber = str => str.includes('-') ? -parseInt(str.replace(/[\D]/g, '')) : parseInt(str.replace(/[\D]/g, ''))

module.exports = ({ username, password, output }) => rp.get(loginUrl).then(res => {
  console.log('Mencoba login Approweb...')
  if (res.request.uri.query === 'r=site/index') {
    apprCSRF = getApprCSRF(res.body)
    return rp.post(loginUrl, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `apprCSRF=${ apprCSRF }&LoginForm%5Bip%5D=${ username }&LoginForm%5BkataSandi%5D=${ password }`
    })
  } else return rp.get(mainUrl + '/index.php?r=userPref/home/tema')
}).then(res => {
  console.log('Login berhasil...')
  if (res.request.uri.query === 'r=userPref/home/tema') apprCSRF = getApprCSRF(res.body)
  const qs = {
    'r': 'pengawasan/sp2dk',
    'Sp2dkFormModel[tipe]': '1',
    'Sp2dkFormModel[kpp]': '',
    'Sp2dkFormModel[kwl]': '',
    'Sp2dkFormModel[jnsperiode]': '0',
    'Sp2dkFormModel[awal]': 'Januari 2020',
    'Sp2dkFormModel[akhir]': 'Desember 2020',
    'Sp2dkFormModel[unit]': '',
  }

  const p = []
  for (let unit of listUnit) {
    qs['Sp2dkFormModel[unit]'] = unit
    p.push(rp.get(mainUrl, { qs }))
  }

  return Promise.all(p)
}).then(listRes => {
  console.log('Mengambil data...')
  const p = []
  for (res of listRes) {
    const $ = cheerio.load(res.body)
    const linkKanwil = $('#sp2dkKwl a').attr('href')
    p.push(rp.get(mainUrl + linkKanwil))
  }

  return Promise.all(p)
}).then(listRes => {
  const p = []
  for (res of listRes) {
    const $ = cheerio.load(res.body)
    $('#sp2dkKPP a').each((i, e) => p.push(rp.get(mainUrl + e.attribs.href)))
  }

  return Promise.all(p)
}).then(listRes => {
  const links = []
  for (res of listRes) {
    const $ = cheerio.load(res.body)
    $('#sp2dkAR a').each((i, e) => links.push(e.attribs.href))
  }
  return links
}).then(async links => {
  const listSp2dk = []
  for (let i = 0; i < links.length; i++) {
    const link = links[i]
    const q = qs.parse(link)
    console.log(`${i + 1}/${links.length} => KPP: ${q['Sp2dkFormModel[kpp]']}, WK: ${q['Sp2dkFormModel[wk]']}, AR: ${q['Sp2dkFormModel[nip]']}`)
    
    const res = await rp.get(mainUrl + link)
    const $ = cheerio.load(res.body)
    const rows = $('#sp2dkWP tbody tr')
    for (let r = 0; r < rows.length; r++) {
      const cols = $('td', $(rows.get(r)))
      const sp2dk = {
        KODE_KPP: q['Sp2dkFormModel[kpp]'],
        NIP18_AR: q['Sp2dkFormModel[nip]'],
        NPWP: $(cols.get(1)).text().trim().replace(/\D/g, ''),
        NAMA_WP: $(cols.get(2)).text().trim(),
        SP2DK: parseNumber($(cols.get(3)).text().trim()),
        SP2DK_BELUM_LHP2DK: parseNumber($(cols.get(4)).text().trim()),
        LHP2DK: parseNumber($(cols.get(5)).text().trim()),
        LHP2DK_SELESAI: parseNumber($(cols.get(6)).text().trim()),
        LHP2DK_USULAN_PEMERIKSAAN: parseNumber($(cols.get(7)).text().trim()),
        LHP2DK_USUL_BUKPER: parseNumber($(cols.get(8)).text().trim()),
        LHP2DK_DALAM_PENGAWASAN: parseNumber($(cols.get(9)).text().trim()),
        LHP2DK_TA: parseNumber($(cols.get(10)).text().trim()),
        POTENSI_AWAL_BELUM_LHP2DK: parseNumber($(cols.get(11)).text().trim()),
        POTENSI_AWAL_SUDAH_LHP2DK: parseNumber($(cols.get(12)).text().trim()),
        PERUBAHAN: parseNumber($(cols.get(13)).text().trim()),
        POTENSI_AKHIR_LHP2DK: parseNumber($(cols.get(14)).text().trim()),
        POTENSI_AKHIR_SELESAI: parseNumber($(cols.get(15)).text().trim()),
        POTENSI_AKHIR_USULAN_PEMERIKSAAN: parseNumber($(cols.get(16)).text().trim()),
        POTENSI_AKHIR_USUL_BUKPER: parseNumber($(cols.get(17)).text().trim()),
        POTENSI_AKHIR_DALAM_PENGAWASAN: parseNumber($(cols.get(18)).text().trim()),
        REALISASI: parseNumber($(cols.get(19)).text().trim()),
        SALDO_DALAM_PENGAWASAN: parseNumber($(cols.get(20)).text().trim()),
      }
      listSp2dk.push(sp2dk)
    }
  }

  return listSp2dk
}).then(data => {
  const wb = xlsx.utils.book_new()
  const ws = xlsx.utils.json_to_sheet(data)
  xlsx.utils.book_append_sheet(wb, ws)
  xlsx.writeFile(wb, output, { type: 'binary' })
}).catch(err => {
  console.log('Terjadi kesalahan...')
  console.error(err)
  process.exit()
})