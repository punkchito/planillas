import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filter'
})
export class FilterPipe implements PipeTransform {
  
  /**
   * Filtra un array de objetos basado en una propiedad específica y un valor
   * 
   * @param items Array de objetos a filtrar
   * @param field Nombre del campo por el cual filtrar
   * @param value Valor a buscar en el campo
   * @returns Array filtrado
   */
  transform(items: any[], field: string, value: any): any[] {
    if (!items || !field || value === undefined || value === null) {
      return items || [];
    }

    // Si el value está vacío, retornar todos los items
    if (value === '' || value === 0) {
      return items;
    }

    return items.filter(item => {
      // Manejar propiedades anidadas (ej: 'user.role.name')
      const fieldValue = this.getNestedProperty(item, field);
      
      if (fieldValue === undefined || fieldValue === null) {
        return false;
      }

      // Convertir ambos valores a string para comparación
      const itemValue = fieldValue.toString().toLowerCase();
      const searchValue = value.toString().toLowerCase();

      return itemValue.includes(searchValue);
    });
  }

  /**
   * Obtiene el valor de una propiedad anidada usando notación de punto
   * 
   * @param obj Objeto del cual obtener la propiedad
   * @param path Ruta de la propiedad (ej: 'user.role.name')
   * @returns Valor de la propiedad o undefined
   */
  private getNestedProperty(obj: any, path: string): any {
    return path.split('.').reduce((current, property) => {
      return current && current[property] !== undefined ? current[property] : undefined;
    }, obj);
  }
}