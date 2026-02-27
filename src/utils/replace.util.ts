export class Replace {
 
   static replaceKeywords(template, data) {
     const keyworRegex = /\[[!\w\.]+\]/g;
     const coincidences = template.matchAll(keyworRegex);
 
     for (const coincidence of coincidences) {
       // Get keyword
       const keyword = coincidence[0];
 
       // Get multilevel key
       const multilevelKey = keyword
         .replace('[', '')
         .replace(']', '');
 
       // Keys
       const keys = multilevelKey.split('.');
 
       // Navigate
       let value = data;
       for (const key of keys) {
         value = value[key];
         if (value === undefined) {
           break;
         }
       }
 
       // print value
       template = template.replace(keyword, value);
     }
 
     return template;
   }
}