/**
 * SmartMenu Partner Program Configuration
 * Centralized settings for easy editing
 */

export const PARTNER_PROGRAM_CONFIG = {
  programName: 'SmartMenu Partner Program',
  ownerEmail: 'webnegosyo3@gmail.com', // Email where notifications are sent
  
  heroSection: {
    title: 'SmartMenu Partner Program',
    subtitle: 'Ialok ang SmartMenu sa mga kliyente mo at kumita sa bawat benta.',
    buttonText: 'Magsimula ng Pag-register',
  },

  howItWorks: [
    {
      step: 1,
      title: 'Mag-register',
      description: 'Kumpletuhin ang application form na may lahat ng kinakailangang impormasyon.',
    },
    {
      step: 2,
      title: 'I-review at i-accept ang Terms',
      description: 'Basahin nang mabuti ang terms and conditions ng partnership.',
    },
    {
      step: 3,
      title: 'Simulan ang pagbebenta',
      description: 'I-offer ang SmartMenu sa mga kliyente mo at kumita ng markup.',
    },
  ],

  termsAndConditions: `# SmartMenu Partner Program Terms and Conditions

## 1. Payment Terms
Partners will receive their markup amount upon successful deployment of SmartMenu to their client. Payment will be processed within 7-14 business days after invoice submission.

## 2. Support Responsibilities
SmartMenu will provide technical support for all installations and training. Partners are responsible for:
- Initial sales and client relationship management
- Communicating client needs to SmartMenu team
- Facilitating timely deployment and training

## 3. Warranty and Refund Policy
SmartMenu offers a 30-day money-back guarantee for new clients. In case of return, the partner's markup will be refunded proportionally based on the amount returned.

## 4. Brand Usage
Partners agree to represent SmartMenu professionally and accurately in all client communications. Unauthorized use of SmartMenu branding is prohibited. All marketing materials must be approved by SmartMenu management.

## 5. Area Exclusivity
By default, there is no area exclusivity. Multiple partners may operate in the same area. However, exclusivity arrangements can be negotiated based on performance and agreement.

## 6. Partnership Termination
Either party may terminate this partnership with 30 days written notice. Upon termination:
- Partners will continue to receive markup for existing clients
- New client signups will not be processed
- All client relationships transfer to SmartMenu for ongoing support

## 7. Confidentiality
Partners agree to maintain confidentiality of proprietary SmartMenu information and pricing details shared during the partnership.

## 8. Compliance
Partners must comply with all applicable Philippine laws and regulations, including but not limited to data privacy and consumer protection laws.

## 9. Amendments
SmartMenu reserves the right to modify these terms with 30 days notice to all active partners.

## 10. Dispute Resolution
Any disputes will be resolved through amicable discussion or arbitration in accordance with Philippine law.`,

  dataPrivacyNotice: `Ang impormasyon na inyong ibinigay sa form na ito ay gagamitin lamang para sa SmartMenu Partner Program, alinsunod sa Data Privacy Act ng Pilipinas. Ang inyong personal na datos ay hindi ibabahagi sa third parties maliban sa mga kinakailangan para sa program operations.`,

  successMessage: {
    title: 'Salamat sa Inyong Pag-register!',
    subtitle: 'Natatanggap namin ang inyong application.',
    details: 'Ang aming team ay mag-rerebyu ng inyong application at makikipag-ugnayan sa inyo sa loob ng 2-3 business days.',
    reminder: 'Ang inyong partnership stamp at lahat ng detalye ay na-save na sa aming sistema.',
  },

  validationMessages: {
    fullNameRequired: 'Ang pangalan ay kailangan.',
    businessNameRequired: 'Ang pangalan ng negosyo ay kailangan.',
    mobileRequired: 'Ang mobile number ay kailangan.',
    mobileInvalid: 'Ang mobile number ay dapat nasa format: 09XX XXX XXXX',
    emailRequired: 'Ang email address ay kailangan.',
    emailInvalid: 'Ang email address ay hindi valid.',
    addressRequired: 'Ang business address/city ay kailangan.',
    offeredPriceRequired: 'Ang presyong ioofer sa client ay kailangan.',
    offeredPriceInvalid: 'Ang presyo ay dapat na numero.',
    markupRequired: 'Ang markup ng partner ay kailangan.',
    markupInvalid: 'Ang markup ay dapat na numero.',
    markupTooHigh: 'Ang markup ay hindi dapat lumampas sa presyong ioofer.',
    termsRequired: 'Kailangan mong i-accept ang Terms and Conditions.',
    duplicateEmail: 'Ang email na ito ay ginamit na para sa isang application.',
    duplicateMobile: 'Ang mobile number na ito ay ginamit na para sa isang application.',
  },
};
