-- 042 · Canal de origen del contacto (Web / Instagram / Facebook / Otro)
--
-- No hay tracking automático de UTM/redes: es un campo editable a mano desde la ficha de contacto.
-- Los leads que ya llegan por la web (crm.procesar_entradas) se marcan 'web' por defecto; comercial/admin
-- ajusta si sabe que el lead vino de Instagram o Facebook.

alter table crm.contactos add column canal_origen text
  check (canal_origen in ('web', 'instagram', 'facebook', 'otro'));

-- Se suma al grant de columnas editables de crm.contactos (039_crm_rls.sql) sin tocar el existente.
grant update (canal_origen) on crm.contactos to authenticated;

-- crm.v_contactos (038_crm_nucleo.sql) hace "select c.*, ...": Postgres expande el "c.*" a la lista de
-- columnas que existían AL CREAR la vista, así que una columna añadida después a crm.contactos nunca
-- llega a la vista aunque el ALTER TABLE haya ido bien. Hay que recrearla para que la recoja. Como
-- "c.*" queda seguido de columnas propias de la vista (n_entradas, ultima_entrada_at, busqueda),
-- CREATE OR REPLACE no vale aquí (insertaría una columna en medio de la lista) — hace falta drop + create.
drop view crm.v_contactos;
create view crm.v_contactos with (security_invoker = true) as
select c.*,
       (select count(*) from crm.entradas e where e.contacto_id = c.id)                 as n_entradas,
       (select max(e.recibido_at) from crm.entradas e where e.contacto_id = c.id)       as ultima_entrada_at,
       lower(coalesce(c.nombre, '') || ' ' || c.email_principal || ' ' || coalesce(c.telefono, '')) as busqueda
from crm.contactos c
where c.fusionado_en is null;
alter view crm.v_contactos owner to crm_owner;
grant select on crm.v_contactos to authenticated;
