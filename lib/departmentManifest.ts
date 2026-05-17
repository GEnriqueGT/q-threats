/** Auto-generated — run: npm run generate:departments */
export const departmentSlugs: Record<string, string> = {
  "Alta Verapaz": "alta-verapaz",
  "Baja Verapaz": "baja-verapaz",
  "Chimaltenango": "chimaltenango",
  "Chiquimula": "chiquimula",
  "El Progreso": "el-progreso",
  "Escuintla": "escuintla",
  "Guatemala": "guatemala",
  "Huehuetenango": "huehuetenango",
  "Izabal": "izabal",
  "Jalapa": "jalapa",
  "Jutiapa": "jutiapa",
  "Petén": "peten",
  "Quetzaltenango": "quetzaltenango",
  "Quiché": "quiche",
  "Retalhuleu": "retalhuleu",
  "Sacatepéquez": "sacatepequez",
  "San Marcos": "san-marcos",
  "Santa Rosa": "santa-rosa",
  "Sololá": "solola",
  "Suchitepéquez": "suchitepequez",
  "Totonicapán": "totonicapan",
  "Zacapa": "zacapa"
};

export const defaultDepartmentSlug = 'guatemala';

export function getDepartmentSlug(name: string): string {
  return departmentSlugs[name] ?? defaultDepartmentSlug;
}
