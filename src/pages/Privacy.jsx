import { useLang } from '../context/LanguageProvider'

const serif = { fontFamily: "Georgia,'Noto Serif SC',serif" }

/* 隐私政策模板页。【】内为占位,上线前由商家/顾问补全并经法务确认。
   三语内容集中在此,便于统一维护。 */
const CONTENT = {
  en: {
    title: 'Privacy Policy',
    updated: 'Last updated: 【DATE】',
    body: [
      ['Data controller', '101 Restaurants (【legal entity name, address, registration no.】) operates this loyalty programme and is the controller of your personal data.'],
      ['What we collect', 'Account email, optional name, phone and birthday, your membership card number, and your purchase and points history at our locations.'],
      ['Why we use it', 'To run the loyalty programme: award and track points, manage tiers and rewards, and verify redemptions. With your separate consent, to send you offers and news.'],
      ['Legal basis', 'Performance of the membership service (GDPR Art. 6(1)(b)) for core features; your consent (Art. 6(1)(a)) for marketing messages, which you can withdraw at any time.'],
      ['Retention', 'We keep membership data while your account is active and for 【period】 afterwards, unless a longer period is required by law.'],
      ['Your rights', 'You may request access, correction, deletion, restriction, or portability of your data, and object to processing. To exercise these rights or withdraw marketing consent, contact 【email】.'],
      ['Sharing', 'Data is stored with our technology providers (hosting and database) acting as processors under contract. We do not sell your data.'],
      ['Contact', 'Questions: 【email / phone / address】. You also have the right to lodge a complaint with the Hungarian data protection authority (NAIH).'],
    ],
  },
  hu: {
    title: 'Adatvédelmi szabályzat',
    updated: 'Utolsó frissítés: 【DÁTUM】',
    body: [
      ['Adatkezelő', 'A 101 Éttermek (【cégnév, cím, cégjegyzékszám】) üzemelteti a hűségprogramot, és a személyes adataid kezelője.'],
      ['Mit gyűjtünk', 'Fiók e-mail, opcionális név, telefonszám és születésnap, tagsági kártyaszám, valamint vásárlási és ponttörténet az éttermeinkben.'],
      ['Miért használjuk', 'A hűségprogram működtetéséhez: pontok jóváírása és nyomon követése, szintek és jutalmak kezelése, beváltások ellenőrzése. Külön hozzájárulásoddal ajánlatok és hírek küldéséhez.'],
      ['Jogalap', 'A tagsági szolgáltatás teljesítése (GDPR 6. cikk (1) b)) az alapfunkciókhoz; hozzájárulásod (6. cikk (1) a)) a marketingüzenetekhez, amelyet bármikor visszavonhatsz.'],
      ['Megőrzés', 'A tagsági adatokat a fiókod aktív állapotáig, majd azt követően 【időszak】-ig őrizzük, kivéve ha jogszabály hosszabb időt ír elő.'],
      ['Jogaid', 'Kérheted az adataidhoz való hozzáférést, helyesbítését, törlését, korlátozását vagy hordozhatóságát, és tiltakozhatsz a kezelés ellen. E jogok gyakorlásához vagy a hozzájárulás visszavonásához: 【e-mail】.'],
      ['Megosztás', 'Az adatokat a technológiai szolgáltatóink (tárhely és adatbázis) tárolják, szerződéses adatfeldolgozóként. Adataidat nem értékesítjük.'],
      ['Kapcsolat', 'Kérdések: 【e-mail / telefon / cím】. Panaszt tehetsz a Nemzeti Adatvédelmi és Információszabadság Hatóságnál (NAIH) is.'],
    ],
  },
  zh: {
    title: '隐私政策',
    updated: '最后更新:【日期】',
    body: [
      ['数据控制者', '101 餐厅(【法律主体名称、地址、登记号】)运营本会员计划,并为您个人数据的控制者。'],
      ['收集内容', '账号邮箱、选填的姓名/电话/生日、会员卡号,以及您在各门店的消费与积分记录。'],
      ['使用目的', '运行会员计划:发放与记录积分、管理等级与奖励、核销兑换。在另行获得您同意的前提下,向您发送优惠与活动信息。'],
      ['法律依据', '核心功能基于会员服务的履行(GDPR 第6(1)(b)条);营销信息基于您的同意(第6(1)(a)条),您可随时撤回。'],
      ['保留期限', '会员数据在您账号有效期间及之后【期限】内保留,法律要求更长者除外。'],
      ['您的权利', '您可要求访问、更正、删除、限制或转移您的数据,并反对处理。行使权利或撤回营销同意,请联系【邮箱】。'],
      ['数据共享', '数据存储于我们的技术服务商(托管与数据库)处,其作为受合同约束的数据处理者。我们不出售您的数据。'],
      ['联系方式', '咨询:【邮箱 / 电话 / 地址】。您亦有权向匈牙利数据保护机构(NAIH)投诉。'],
    ],
  },
}

export default function Privacy({ onBack }) {
  const { lang } = useLang()
  const c = CONTENT[lang] || CONTENT.en

  return (
    <div style={{ padding: '24px 4px 60px', maxWidth: 600, margin: '0 auto' }}>
      <button onClick={onBack} style={{ color: '#c9a14f', fontSize: 14, marginBottom: 16 }}>
        ‹ {c.title}
      </button>
      <div style={{ ...serif, fontSize: 24, marginBottom: 4 }}>{c.title}</div>
      <div style={{ fontSize: 12, color: '#a89c89', marginBottom: 20 }}>{c.updated}</div>
      {c.body.map(([h, p], i) => (
        <div key={i} style={{ marginBottom: 18 }}>
          <div style={{ ...serif, fontSize: 15, color: '#c9a14f', marginBottom: 4 }}>{h}</div>
          <div style={{ fontSize: 14, lineHeight: 1.6, color: '#d8cdbb' }}>{p}</div>
        </div>
      ))}
    </div>
  )
}
