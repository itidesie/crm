-- Da de alta tu usuario como ADMINISTRADOR del CRM.
-- Requisitos: (1) ya ejecutaste 01-crm-esquema-produccion.sql; (2) ya creaste la cuenta en
-- Authentication → Users (con «Auto Confirm User»). Cambia el email y el nombre.

insert into crm.usuarios (id, nombre, email, rol)
select id, 'TU NOMBRE', email, 'admin'
from auth.users
where email = 'TU@EMAIL.COM';

-- Debe decir «Success. 1 row affected». Si dice 0, el email no coincide con el de Authentication.
-- Otros usuarios: cambia 'admin' por 'comercial' (edita lo suyo) o 'lectura' (solo consulta).
