-- =============================================================================
-- SEED LOCAL — DATOS FALSOS. Generado por scripts/generar-seed.mjs (no editar a mano).
-- Se ejecuta automáticamente tras las migraciones en `supabase db reset`.
-- =============================================================================

insert into public.ofertas_empleo (id, puesto, empresa, ubicacion, salario, tipo_contrato, descripcion, activa) values
  (1, 'BIM Coordinator', 'Constructora Levante', 'Valencia', '32.000 - 38.000 €/año', 'Indefinido', 'Oferta de ejemplo (seed local).', true),
  (2, 'BIM Manager', 'Ingeniería Cantábrico', 'Bilbao', '45.000 - 55.000 €/año', 'Indefinido', 'Oferta de ejemplo (seed local).', true),
  (3, 'Ingeniero MEP (BIM)', 'Instalaciones Sur', 'Sevilla', '30.000 - 36.000 €/año', 'Jornada completa', 'Oferta de ejemplo (seed local).', true),
  (4, 'Delineante BIM', 'Estudio Arquitectura Norte', 'Remoto', '24.000 - 28.000 €/año', 'Freelance', 'Oferta de ejemplo (seed local).', true);
select setval(pg_get_serial_sequence('public.ofertas_empleo', 'id'), 4);

-- solicitudes_admision
insert into public.solicitudes_admision (nombre_completo, email, telefono, pais, ciudad, fecha_nacimiento, titulacion_previa, universidad_origen, programa_solicitado, origen, mensaje, rgpd_aceptado, estado, created_at) values
  ('David Moreno Iglesias', 'david.moreno@estudio-arq.es', '4682859359', 'Argentina', 'Buenos Aires', '1989-08-11', 'Ingeniería Industrial', 'Universidad de Sevilla', 'Online', 'online', 'Me interesa especializarme en BIM para proyectos de edificación.', true, 'aceptado', now() - interval '69 days 22 hours 45 minutes'),
  ('Cristina Iglesias Fernández', 'Cristina.iglesias@gmail.com', '4708257818', 'Ecuador', 'Quito', '1990-05-18', 'Máster en Arquitectura', 'Universidad de Buenos Aires', 'Online', 'online', null, true, 'aceptado', now() - interval '26 days 4 hours 33 minutes'),
  ('Sofía Rubio Blanco', 'SOFIA.RUBIO@INGENIERIASUR.COM', '+34 676 931 199', 'España', 'Bilbao', '1984-02-14', 'Grado en Ingeniería de Edificación', 'Universidad del País Vasco', 'Online', 'landing', 'Me interesa especializarme en BIM para proyectos de edificación.', true, 'pendiente', now() - interval '41 days 18 hours 37 minutes'),
  ('Mateo Delgado Rodríguez', 'Mateo.delgado@gmail.com', '696683155', 'España', 'Málaga', '1982-06-11', 'Grado en Ingeniería de Edificación', 'Universitat Politècnica de Catalunya', 'Online', 'online', null, true, 'aceptado', now() - interval '128 days 9 hours 14 minutes'),
  ('Beatriz Ortiz Vázquez', '  beatriz.ortiz@gmail.com  ', '7468489980', 'Argentina', 'Buenos Aires', '1983-07-12', 'Máster en Arquitectura', 'Universidad del País Vasco', 'MBBE', 'mbbe', 'Me interesa especializarme en BIM para proyectos de edificación.', true, 'aceptado', now() - interval '87 days 22 hours 16 minutes'),
  ('Sergio Muñoz Ramos', 'sergio.munoz@hotmail.com', '+34 644 687 586', 'España', 'Valencia', '1988-06-16', 'Grado en Ingeniería Civil', 'Universidad Nacional de Colombia', 'Online', 'online', null, true, 'aceptado', now() - interval '165 days 2 hours 58 minutes'),
  ('Raúl Domínguez Gómez', 'RAUL.DOMINGUEZ@OUTLOOK.COM', '+34 601 473 565', 'España', 'A Coruña', '1985-08-12', 'Grado en Ingeniería de Edificación', 'Universidad de Buenos Aires', 'MBIM', 'mbim', null, true, 'aceptado', now() - interval '144 days 9 hours 56 minutes'),
  ('Javier González Ruiz', 'JAVIER.GONZALEZ@GMAIL.COM', '643566992', 'España', 'Valladolid', '1985-07-17', 'Grado en Ingeniería Civil', 'Universidad Nacional de Colombia', 'EMBIM', 'embim', 'Me interesa especializarme en BIM para proyectos de edificación.', true, 'pendiente', now() - interval '33 days 20 hours 17 minutes'),
  ('Javier González Ruiz', 'javiergonzalez@gmail.com', '+52 621 225 3651', 'México', 'Ciudad de México', '1998-02-12', 'Grado en Ingeniería Civil', 'Universidad de Sevilla', 'EMBIM', 'embim', null, true, 'revisado', now() - interval '68 days 23 hours 29 minutes'),
  ('Carmen Rubio Sanz', '  carmen.rubio@gmail.com  ', '+51 475 714 4660', 'Perú', 'Lima', '1995-06-16', 'Ingeniería Industrial', 'Universidad de Chile', 'MBBE', 'landing', null, true, 'revisado', now() - interval '60 days 6 hours 0 minutes'),
  ('Sergio Morales Iglesias', 'sergio.morales@gmail.com', '+54 859 822 3696', 'Argentina', 'Buenos Aires', '1994-05-11', 'Ingeniería de Caminos, Canales y Puertos', 'Universidad de Sevilla', 'MBIM', 'landing', null, true, 'revisado', now() - interval '93 days 18 hours 22 minutes'),
  ('Daniel Alonso Rubio', 'DANIEL.ALONSO@INGENIERIASUR.COM', '+34 689 354 469', 'España', 'Barcelona', '1994-03-17', 'Grado en Ingeniería Civil', 'Universidad de Chile', 'Online', 'landing', null, true, 'aceptado', now() - interval '85 days 0 hours 52 minutes'),
  ('Mateo García Fernández', '  mateo.garcia@hotmail.com  ', '676120901', 'España', 'Valladolid', '1994-09-10', 'Ingeniería Industrial', 'Universidad de Sevilla', 'EMBIM', 'landing', null, true, 'pendiente', now() - interval '37 days 12 hours 25 minutes'),
  ('Beatriz Suárez Pérez', 'beatriz.suarez@estudio-arq.es', '+34 679 740 698', 'España', 'Zaragoza', '1983-03-18', 'Máster en Arquitectura', 'Universidad del País Vasco', 'EMBIM', 'embim', null, true, 'aceptado', now() - interval '167 days 18 hours 7 minutes'),
  ('Elena Marín Díaz', 'elena.marin@estudio-arq.es', '644988336', 'España', 'A Coruña', '1993-03-10', 'Ingeniería de Caminos, Canales y Puertos', 'Universidad de Buenos Aires', 'MBBE', 'landing', 'Me interesa especializarme en BIM para proyectos de edificación.', true, 'aceptado', now() - interval '105 days 17 hours 39 minutes'),
  ('Sara Díaz Navarro', 'sara.diaz@outlook.com', '+54 959 402 3566', 'Argentina', 'Buenos Aires', '1997-08-19', 'Grado en Arquitectura', 'UNAM', 'MBIM', 'mbim', 'Me interesa especializarme en BIM para proyectos de edificación.', true, 'aceptado', now() - interval '159 days 18 hours 8 minutes'),
  ('Iván López Sánchez', 'IVAN.LOPEZ@GMAIL.COM', '7743518933', 'Ecuador', 'Quito', '1996-02-11', 'Ingeniería de Telecomunicación', 'Universidad Nacional de Colombia', 'MBBE', 'landing', null, true, 'aceptado', now() - interval '116 days 20 hours 1 minutes'),
  ('Isabel Gil Muñoz', 'Isabel.Gil@ingenieriasur.com', '5732202899', 'Ecuador', 'Quito', '1994-08-15', 'Grado en Ingeniería de Edificación', 'Universidad de Buenos Aires', 'EMBIM', 'embim', null, true, 'aceptado', now() - interval '81 days 21 hours 29 minutes'),
  ('Adrián Ruiz Molina', 'adrian.ruiz@outlook.com', '+34 662 224 689', 'España', 'Málaga', '1989-03-12', 'Ingeniería Industrial', 'Universidad de Chile', 'Online', 'online', 'Me interesa especializarme en BIM para proyectos de edificación.', true, 'rechazado', now() - interval '129 days 21 hours 3 minutes'),
  ('Óscar Torres Alonso', 'Oscar.Torres@outlook.com', '8854719909', 'Argentina', 'Buenos Aires', '1979-07-14', 'Arquitectura Técnica', 'Universidad de Buenos Aires', 'MBIM', 'mbim', 'Me interesa especializarme en BIM para proyectos de edificación.', true, 'revisado', now() - interval '110 days 4 hours 41 minutes'),
  ('Paula Vázquez Morales', 'paula.vazquez@outlook.com', '5545564676', 'Argentina', 'Buenos Aires', '1986-09-19', 'Ingeniería de Telecomunicación', 'Universidad del País Vasco', 'MBIM', 'landing', 'Me interesa especializarme en BIM para proyectos de edificación.', true, 'aceptado', now() - interval '151 days 10 hours 47 minutes'),
  ('Isabel Vázquez Gil', 'Isabel.Vazquez@construccionesnorte.es', '601197363', 'España', 'A Coruña', '1984-04-19', 'Grado en Arquitectura', 'Universidad de Sevilla', 'MBBE', 'landing', 'Me interesa especializarme en BIM para proyectos de edificación.', true, 'revisado', now() - interval '82 days 15 hours 1 minutes'),
  ('Elena Blanco Rodríguez', '  elena.blanco@estudio-arq.es  ', '683848667', 'España', 'Málaga', '1990-01-13', 'Arquitectura Técnica', 'Universidad de Buenos Aires', 'Online', 'online', 'Me interesa especializarme en BIM para proyectos de edificación.', true, 'aceptado', now() - interval '69 days 18 hours 6 minutes'),
  ('Raúl Díaz Morales', 'Raul.diaz@icloud.com', '8287596562', 'Perú', 'Lima', '1990-04-19', 'Máster en Arquitectura', 'Universitat Politècnica de València', 'Online', 'landing', 'Me interesa especializarme en BIM para proyectos de edificación.', true, 'revisado', now() - interval '27 days 6 hours 4 minutes'),
  ('David Moreno Iglesias', 'David.moreno@estudio-arq.es', '4682859359', 'Argentina', 'Buenos Aires', '1987-09-13', 'Ingeniería Industrial', 'Universidad de Sevilla', 'EMBIM', 'embim', null, true, 'aceptado', now() - interval '48 days 23 hours 12 minutes'),
  ('Cristina Iglesias Fernández', 'cristina.iglesias@gmail.com', '4708257818', 'Ecuador', 'Quito', '1992-04-19', 'Máster en Arquitectura', 'Universidad de Buenos Aires', 'MBBE', 'mbbe', 'Me interesa especializarme en BIM para proyectos de edificación.', true, 'revisado', now() - interval '13 days 11 hours 19 minutes'),
  ('Sofía Rubio Blanco', 'Sofia.Rubio@ingenieriasur.com', '676931199', 'España', 'Bilbao', '1985-01-12', 'Grado en Ingeniería de Edificación', 'Universidad del País Vasco', 'Online', 'online', null, true, 'rechazado', now() - interval '55 days 20 hours 5 minutes'),
  ('Mateo Delgado Rodríguez', 'mateo.delgado@gmail.com', '696683155', 'España', 'Málaga', '1983-05-18', 'Grado en Ingeniería de Edificación', 'Universitat Politècnica de Catalunya', 'EMBIM', 'embim', null, true, 'revisado', now() - interval '34 days 17 hours 18 minutes'),
  ('Beatriz Ortiz Vázquez', 'beatriz.ortiz@gmail.com', '7468489980', 'Argentina', 'Buenos Aires', '1981-05-19', 'Máster en Arquitectura', 'Universidad del País Vasco', 'EMBIM', 'landing', null, true, 'revisado', now() - interval '43 days 21 hours 49 minutes'),
  ('Sergio Muñoz Ramos', 'sergio.munoz@hotmail.com', '+34 644 687 586', 'España', 'Valencia', '1986-03-10', 'Grado en Ingeniería Civil', 'Universidad Nacional de Colombia', 'Online', 'online', null, true, 'revisado', now() - interval '33 days 8 hours 52 minutes');

-- mensajes_contacto
insert into public.mensajes_contacto (nombre, email, telefono, asunto, mensaje, motivo, programa, created_at) values
  ('Sergio Morales', 'sergio.morales@gmail.com', '+54 859 822 3696', 'Información sobre el máster', 'Hola, me gustaría saber si hay plazas para la próxima convocatoria y qué requisitos hay.', 'asesoria', 'MBBE', now() - interval '57 days 22 hours 57 minutes'),
  ('Daniel Alonso', 'daniel.alonso@ingenieriasur.com', '+34 689 354 469', 'Financiación', '¿Ofrecéis pago fraccionado o becas? Trabajo actualmente y quisiera compaginarlo.', 'asesoria', 'MBIM', now() - interval '38 days 6 hours 46 minutes'),
  ('Mateo García', 'Mateo.Garcia@hotmail.com', '676120901', 'Convalidación de créditos', 'Tengo formación previa en Revit y Navisworks, ¿se puede convalidar algún módulo?', null, null, now() - interval '6 days 18 hours 27 minutes'),
  ('Beatriz Suárez', 'BEATRIZ.SUAREZ@ESTUDIO-ARQ.ES', '679740698', 'Fechas de inicio', '¿Cuándo empieza la próxima edición del máster online y cuántas horas semanales requiere?', 'asesoria', 'Online', now() - interval '1 days 2 hours 19 minutes'),
  ('Elena Marín', 'Elena.Marin@estudio-arq.es', null, 'Prácticas', 'Quisiera confirmar cómo funcionan las prácticas remuneradas y si están garantizadas.', null, null, now() - interval '78 days 7 hours 43 minutes'),
  ('Sara Díaz', 'sara.diaz@outlook.com', null, 'Formación para empresa', 'Somos una constructora de 40 personas y queremos formar a nuestro equipo en BIM. ¿Podéis enviarnos una propuesta?', 'asesoria', 'EMBIM', now() - interval '7 days 6 hours 31 minutes'),
  ('Iván López', 'IVAN.LOPEZ@GMAIL.COM', '7743518933', 'Titulación requerida', 'Soy aparejador con 8 años de experiencia. ¿Puedo acceder al Executive Master?', null, null, now() - interval '71 days 23 hours 5 minutes'),
  ('Isabel Gil', 'ISABEL.GIL@INGENIERIASUR.COM', '+593 573 220 2899', 'Problema con el catálogo', 'He solicitado el catálogo pero no me ha llegado el correo, ¿podéis reenviarlo?', 'asesoria', 'EMBIM', now() - interval '55 days 10 hours 46 minutes'),
  ('Adrián Ruiz', 'ADRIAN.RUIZ@OUTLOOK.COM', '662224689', 'Reserva de plaza', 'Quiero reservar plaza. ¿Cuál es el proceso y el importe de la matrícula?', 'asesoria', 'EMBIM', now() - interval '108 days 7 hours 34 minutes'),
  ('Óscar Torres', 'Oscar.Torres@outlook.com', null, 'Convenio universitario', 'Escribo desde la oficina de empleo de mi universidad para explorar una colaboración.', null, null, now() - interval '16 days 6 hours 13 minutes'),
  ('Paula Vázquez', 'paula.vazquez@outlook.com', '5545564676', 'Información sobre el máster', 'Hola, me gustaría saber si hay plazas para la próxima convocatoria y qué requisitos hay.', 'asesoria', 'EMBIM', now() - interval '10 days 9 hours 52 minutes'),
  ('Isabel Vázquez', 'Isabel.vazquez@construccionesnorte.es', '601197363', 'Financiación', '¿Ofrecéis pago fraccionado o becas? Trabajo actualmente y quisiera compaginarlo.', 'asesoria', 'EMBIM', now() - interval '8 days 9 hours 8 minutes'),
  ('Elena Blanco', 'elena.blanco@estudio-arq.es', null, 'Convalidación de créditos', 'Tengo formación previa en Revit y Navisworks, ¿se puede convalidar algún módulo?', null, null, now() - interval '88 days 5 hours 27 minutes'),
  ('Raúl Díaz', '  raul.diaz@icloud.com  ', null, 'Fechas de inicio', '¿Cuándo empieza la próxima edición del máster online y cuántas horas semanales requiere?', null, null, now() - interval '69 days 0 hours 57 minutes'),
  ('Andrea Domínguez', 'ANDREA.DOMINGUEZ@GMAIL.COM', '7615236595', 'Prácticas', 'Quisiera confirmar cómo funcionan las prácticas remuneradas y si están garantizadas.', 'asesoria', 'EMBIM', now() - interval '164 days 13 hours 13 minutes'),
  ('Alejandro Delgado', 'alejandro.delgado@gmail.com', '3779827284', 'Formación para empresa', 'Somos una constructora de 40 personas y queremos formar a nuestro equipo en BIM. ¿Podéis enviarnos una propuesta?', null, null, now() - interval '140 days 4 hours 36 minutes'),
  ('Paula Rodríguez', '  paula.rodriguez@icloud.com  ', null, 'Titulación requerida', 'Soy aparejador con 8 años de experiencia. ¿Puedo acceder al Executive Master?', null, null, now() - interval '42 days 4 hours 2 minutes'),
  ('Isabel López', '  isabel.lopez@construccionesnorte.es  ', null, 'Problema con el catálogo', 'He solicitado el catálogo pero no me ha llegado el correo, ¿podéis reenviarlo?', null, null, now() - interval '82 days 19 hours 32 minutes'),
  ('Carlos Domínguez', 'CARLOS.DOMINGUEZ@ICLOUD.COM', '602981123', 'Reserva de plaza', 'Quiero reservar plaza. ¿Cuál es el proceso y el importe de la matrícula?', null, null, now() - interval '59 days 9 hours 0 minutes'),
  ('Ana Alonso', 'ana.alonso@yahoo.es', '8777108880', 'Convenio universitario', 'Escribo desde la oficina de empleo de mi universidad para explorar una colaboración.', null, null, now() - interval '99 days 22 hours 26 minutes'),
  ('Carmen Iglesias', 'carmen.iglesias@construccionesnorte.es', '8547108932', 'Información sobre el máster', 'Hola, me gustaría saber si hay plazas para la próxima convocatoria y qué requisitos hay.', 'asesoria', 'EMBIM', now() - interval '64 days 19 hours 11 minutes'),
  ('Cristina Delgado', '  cristina.delgado@estudio-arq.es  ', '676822506', 'Financiación', '¿Ofrecéis pago fraccionado o becas? Trabajo actualmente y quisiera compaginarlo.', null, null, now() - interval '163 days 7 hours 50 minutes'),
  ('Irene Ramírez', '  irene.ramirez@ingenieriasur.com  ', null, 'Convalidación de créditos', 'Tengo formación previa en Revit y Navisworks, ¿se puede convalidar algún módulo?', 'asesoria', 'Online', now() - interval '80 days 11 hours 39 minutes'),
  ('Álvaro Sanz', 'ALVARO.SANZ@ICLOUD.COM', null, 'Fechas de inicio', '¿Cuándo empieza la próxima edición del máster online y cuántas horas semanales requiere?', 'asesoria', 'MBBE', now() - interval '86 days 2 hours 13 minutes');

-- descargas_catalogo
insert into public.descargas_catalogo (nombre, email, telefono, catalogo_id, catalogo_nombre, programa, rgpd_aceptado, created_at) values
  ('Paula Vázquez Morales', 'PAULA.VAZQUEZ@OUTLOOK.COM', '+54 554 556 4676', 'mbim-online', 'Máster BIM Online', 'Online', true, now() - interval '15 days 0 hours 18 minutes'),
  ('Isabel Vázquez Gil', 'isabel.vazquez@construccionesnorte.es', '+34 601 197 363', 'mbim-building-engineering', 'Máster BIM & Building Engineering', 'MBBE', true, now() - interval '166 days 14 hours 12 minutes'),
  ('Elena Blanco Rodríguez', 'Elena.blanco@estudio-arq.es', '683848667', 'mbim-online', 'Máster BIM Online', 'Online', true, now() - interval '97 days 10 hours 40 minutes'),
  ('Raúl Díaz Morales', '  raul.diaz@icloud.com  ', '8287596562', 'mbim-building-engineering', 'Máster BIM & Building Engineering', 'MBBE', true, now() - interval '4 days 13 hours 7 minutes'),
  ('Andrea Domínguez Romero', 'ANDREA.DOMINGUEZ@GMAIL.COM', '+52 761 523 6595', 'executive-master-bim', 'Executive Máster BIM', 'EMBIM', true, now() - interval '93 days 18 hours 9 minutes'),
  ('Alejandro Delgado Ramos', 'Alejandro.delgado@gmail.com', '3779827284', 'mbim-fulltime', 'Máster BIM Full Time', 'MBIM', true, now() - interval '73 days 9 hours 29 minutes'),
  ('Paula Rodríguez García', 'paula.rodriguez@icloud.com', '+51 768 505 7986', 'executive-master-bim', 'Executive Máster BIM', 'EMBIM', true, now() - interval '134 days 14 hours 4 minutes'),
  ('Isabel López Martínez', 'Isabel.lopez@construccionesnorte.es', '+54 686 722 2448', 'executive-master-bim', 'Executive Máster BIM', 'EMBIM', true, now() - interval '60 days 13 hours 17 minutes'),
  ('Carlos Domínguez Pérez', 'CARLOS.DOMINGUEZ@ICLOUD.COM', '+34 602 981 123', 'mbim-fulltime', 'Máster BIM Full Time', 'MBIM', true, now() - interval '157 days 4 hours 9 minutes'),
  ('Ana Alonso Martín', '  ana.alonso@yahoo.es  ', '+54 877 710 8880', 'mbim-online', 'Máster BIM Online', 'Online', true, now() - interval '174 days 22 hours 17 minutes'),
  ('Carmen Iglesias Hernández', 'Carmen.Iglesias@construccionesnorte.es', '8547108932', 'mbim-fulltime', 'Máster BIM Full Time', 'MBIM', true, now() - interval '166 days 8 hours 13 minutes'),
  ('Cristina Delgado Delgado', 'cristina.delgado@estudio-arq.es', '+34 676 822 506', 'mbim-building-engineering', 'Máster BIM & Building Engineering', 'MBBE', true, now() - interval '161 days 19 hours 29 minutes'),
  ('Irene Ramírez Martín', 'Irene.Ramirez@ingenieriasur.com', '+54 840 301 5724', 'executive-master-bim', 'Executive Máster BIM', 'EMBIM', true, now() - interval '168 days 11 hours 18 minutes'),
  ('Álvaro Sanz Alonso', 'alvaro.sanz@icloud.com', '+54 450 621 6137', 'mbim-online', 'Máster BIM Online', 'Online', true, now() - interval '156 days 14 hours 44 minutes'),
  ('Miguel Sanz Morales', 'MIGUEL.SANZ@GMAIL.COM', '+52 365 266 4876', 'mbim-building-engineering', 'Máster BIM & Building Engineering', 'MBBE', true, now() - interval '63 days 14 hours 28 minutes'),
  ('Carmen Muñoz Gutiérrez', 'Carmen.munoz@outlook.com', '626659346', 'mbim-fulltime', 'Máster BIM Full Time', 'MBIM', true, now() - interval '34 days 15 hours 15 minutes'),
  ('Miguel Ortiz Ortega', 'miguel.ortiz@gmail.com', '647643357', 'executive-master-bim', 'Executive Máster BIM', 'EMBIM', true, now() - interval '160 days 16 hours 5 minutes'),
  ('Patricia Molina Iglesias', 'patricia.molina@yahoo.es', '6521818247', 'mbim-online', 'Máster BIM Online', 'Online', true, now() - interval '124 days 16 hours 58 minutes'),
  ('Sara Iglesias Rubio', '  sara.iglesias@gmail.com  ', '+34 611 926 908', 'mbim-online', 'Máster BIM Online', 'Online', true, now() - interval '44 days 21 hours 53 minutes'),
  ('Paula García Álvarez', '  paula.garcia@gmail.com  ', '+34 623 754 571', 'mbim-fulltime', 'Máster BIM Full Time', 'MBIM', true, now() - interval '107 days 14 hours 12 minutes'),
  ('Alejandro Iglesias Gil', '  alejandro.iglesias@gmail.com  ', '689859385', 'mbim-fulltime', 'Máster BIM Full Time', 'MBIM', true, now() - interval '36 days 3 hours 12 minutes'),
  ('Álvaro Gómez Jiménez', 'alvaro.gomez@gmail.com', '+34 651 200 545', 'mbim-building-engineering', 'Máster BIM & Building Engineering', 'MBBE', true, now() - interval '15 days 5 hours 31 minutes'),
  ('Marta Ramos García', '  marta.ramos@icloud.com  ', '614651750', 'mbim-fulltime', 'Máster BIM Full Time', 'MBIM', true, now() - interval '172 days 1 hours 57 minutes'),
  ('Sofía Sánchez Jiménez', 'Sofia.Sanchez@ingenieriasur.com', '662781584', 'mbim-building-engineering', 'Máster BIM & Building Engineering', 'MBBE', true, now() - interval '35 days 11 hours 55 minutes'),
  ('Rocío Rodríguez Rubio', 'Rocio.Rodriguez@gmail.com', '+57 510 107 6315', 'mbim-fulltime', 'Máster BIM Full Time', 'MBIM', true, now() - interval '122 days 11 hours 55 minutes'),
  ('Elena Iglesias Iglesias', 'ELENA.IGLESIAS@YAHOO.ES', '+34 606 364 710', 'mbim-online', 'Máster BIM Online', 'Online', true, now() - interval '47 days 5 hours 12 minutes'),
  ('Sofía Suárez Rodríguez', 'sofia.suarez@gmail.com', '+34 655 768 407', 'mbim-online', 'Máster BIM Online', 'Online', true, now() - interval '170 days 14 hours 51 minutes'),
  ('Carmen García Ramos', 'Carmen.garcia@construccionesnorte.es', '+34 662 852 135', 'executive-master-bim', 'Executive Máster BIM', 'EMBIM', true, now() - interval '173 days 13 hours 23 minutes'),
  ('Jorge Ortega Rodríguez', 'Jorge.ortega@icloud.com', '652948186', 'mbim-building-engineering', 'Máster BIM & Building Engineering', 'MBBE', true, now() - interval '131 days 3 hours 49 minutes'),
  ('Elena Marín Rubio', 'Elena.marin@gmail.com', '+34 622 726 583', 'mbim-online', 'Máster BIM Online', 'Online', true, now() - interval '28 days 7 hours 27 minutes'),
  ('Irene Alonso Sánchez', '  irene.alonso@gmail.com  ', '642758993', 'executive-master-bim', 'Executive Máster BIM', 'EMBIM', true, now() - interval '31 days 9 hours 47 minutes'),
  ('Carlos Álvarez Delgado', 'carlos.alvarez@outlook.com', '696289978', 'mbim-fulltime', 'Máster BIM Full Time', 'MBIM', true, now() - interval '77 days 14 hours 37 minutes'),
  ('Fernando Ramírez Marín', 'Fernando.Ramirez@estudio-arq.es', '+54 403 179 1444', 'executive-master-bim', 'Executive Máster BIM', 'EMBIM', true, now() - interval '70 days 4 hours 11 minutes'),
  ('Ana Molina Blanco', '  ana.molina@hotmail.com  ', '+34 655 396 154', 'executive-master-bim', 'Executive Máster BIM', 'EMBIM', true, now() - interval '32 days 18 hours 4 minutes');

-- candidaturas_empleo
insert into public.candidaturas_empleo (oferta_id, oferta_puesto, nombre, email, telefono, mensaje, created_at) values
  (1, 'BIM Coordinator', 'Alejandro Iglesias Gil', 'ALEJANDRO.IGLESIAS@GMAIL.COM', '+34 689 859 385', 'Adjunto mi experiencia en modelado BIM. Quedo a la espera de vuestras noticias.', now() - interval '135 days 8 hours 41 minutes'),
  (2, 'BIM Manager', 'Álvaro Gómez Jiménez', '  alvaro.gomez@gmail.com  ', '+34 651 200 545', 'Adjunto mi experiencia en modelado BIM. Quedo a la espera de vuestras noticias.', now() - interval '132 days 22 hours 6 minutes'),
  (3, 'Ingeniero MEP (BIM)', 'Marta Ramos García', 'marta.ramos@icloud.com', '614651750', 'Adjunto mi experiencia en modelado BIM. Quedo a la espera de vuestras noticias.', now() - interval '15 days 1 hours 34 minutes'),
  (4, 'Delineante BIM', 'Sofía Sánchez Jiménez', 'Sofia.sanchez@ingenieriasur.com', '+34 662 781 584', 'Adjunto mi experiencia en modelado BIM. Quedo a la espera de vuestras noticias.', now() - interval '0 days 14 hours 13 minutes'),
  (1, 'BIM Coordinator', 'Rocío Rodríguez Rubio', 'ROCIO.RODRIGUEZ@GMAIL.COM', '5101076315', 'Adjunto mi experiencia en modelado BIM. Quedo a la espera de vuestras noticias.', now() - interval '166 days 22 hours 50 minutes'),
  (2, 'BIM Manager', 'Elena Iglesias Iglesias', '  elena.iglesias@yahoo.es  ', '606364710', 'Adjunto mi experiencia en modelado BIM. Quedo a la espera de vuestras noticias.', now() - interval '143 days 0 hours 19 minutes'),
  (3, 'Ingeniero MEP (BIM)', 'Sofía Suárez Rodríguez', 'SOFIA.SUAREZ@GMAIL.COM', '+34 655 768 407', 'Adjunto mi experiencia en modelado BIM. Quedo a la espera de vuestras noticias.', now() - interval '77 days 5 hours 6 minutes'),
  (4, 'Delineante BIM', 'Carmen García Ramos', 'carmen.garcia@construccionesnorte.es', '+34 662 852 135', 'Adjunto mi experiencia en modelado BIM. Quedo a la espera de vuestras noticias.', now() - interval '123 days 10 hours 26 minutes'),
  (1, 'BIM Coordinator', 'Jorge Ortega Rodríguez', 'Jorge.ortega@icloud.com', '+34 652 948 186', 'Adjunto mi experiencia en modelado BIM. Quedo a la espera de vuestras noticias.', now() - interval '100 days 5 hours 29 minutes'),
  (2, 'BIM Manager', 'Elena Marín Rubio', 'Elena.marin@gmail.com', '622726583', 'Adjunto mi experiencia en modelado BIM. Quedo a la espera de vuestras noticias.', now() - interval '30 days 19 hours 44 minutes'),
  (3, 'Ingeniero MEP (BIM)', 'Irene Alonso Sánchez', 'irene.alonso@gmail.com', '+34 642 758 993', 'Adjunto mi experiencia en modelado BIM. Quedo a la espera de vuestras noticias.', now() - interval '121 days 18 hours 30 minutes'),
  (null, 'Candidatura espontánea', 'Carlos Álvarez Delgado', 'Carlos.alvarez@outlook.com', '+34 696 289 978', 'Adjunto mi experiencia en modelado BIM. Quedo a la espera de vuestras noticias.', now() - interval '132 days 15 hours 16 minutes');

-- orders + order_items
insert into public.orders (id, customer_email, customer_name, customer_phone, status, total_amount, created_at) values
  (1, 'david.moreno@estudio-arq.es', 'David Moreno Iglesias', '4682859359', 'pending', 3000, now() - interval '121 days 5 hours 39 minutes'),
  (2, 'cristina.iglesias@gmail.com', 'Cristina Iglesias Fernández', null, 'paid', 4500, now() - interval '66 days 19 hours 29 minutes'),
  (3, 'SOFIA.RUBIO@INGENIERIASUR.COM', 'Sofía Rubio Blanco', '676931199', 'pending', 18000, now() - interval '55 days 19 hours 21 minutes'),
  (4, 'Mateo.Delgado@gmail.com', 'Mateo Delgado Rodríguez', null, 'pending', 3000, now() - interval '104 days 10 hours 6 minutes'),
  (5, 'beatriz.ortiz@gmail.com', 'Beatriz Ortiz Vázquez', '7468489980', 'pending', 262.5, now() - interval '35 days 20 hours 14 minutes'),
  (6, 'sergio.munoz@hotmail.com', 'Sergio Muñoz Ramos', '644687586', 'paid', 15000, now() - interval '54 days 9 hours 5 minutes'),
  (7, 'RAUL.DOMINGUEZ@OUTLOOK.COM', 'Raúl Domínguez Gómez', null, 'pending', 3000, now() - interval '61 days 21 hours 54 minutes'),
  (8, '  javier.gonzalez@gmail.com  ', 'Javier González Ruiz', '+34 643 566 992', 'pending', 18000, now() - interval '128 days 18 hours 58 minutes'),
  (9, 'Javiergonzalez@gmail.com', 'Javier González Ruiz', null, 'pending', 0, now() - interval '57 days 19 hours 24 minutes'),
  (10, '  carmen.rubio@gmail.com  ', 'Carmen Rubio Sanz', null, 'paid', 3000, now() - interval '62 days 6 hours 19 minutes');
insert into public.order_items (order_id, product_id, product_name, quantity, price) values
  (1, 8, 'Matrícula — Master BIM Full Time', 1, 3000),
  (2, 9, 'Master BIM Online', 1, 4500),
  (3, 10, 'Executive Master BIM', 1, 18000),
  (4, 11, 'Matrícula — Curso de Revit - Iniciación', 1, 3000),
  (5, 12, 'Título Profesional CUALIFICAM', 1, 262.5),
  (6, 8, 'Master BIM Full Time', 1, 15000),
  (7, 9, 'Matrícula — Master BIM Online', 1, 3000),
  (8, 10, 'Executive Master BIM', 1, 18000),
  (9, 11, 'Curso de Revit - Iniciación', 1, 0),
  (10, 12, 'Matrícula — Título Profesional CUALIFICAM', 1, 3000);
select setval(pg_get_serial_sequence('public.orders', 'id'), 10);

-- solicitudes_baja
insert into public.solicitudes_baja (email, motivo, created_at) values
  ('mateo.delgado@gmail.com', 'no_interes', now() - interval '4 days 19 hours 10 minutes'),
  ('elena.marin@estudio-arq.es', 'spam', now() - interval '34 days 12 hours 49 minutes'),
  ('carlos.dominguez@icloud.com', 'privacidad', now() - interval '51 days 13 hours 38 minutes'),
  ('rocio.rodriguez@gmail.com', 'otro', now() - interval '14 days 3 hours 53 minutes');

-- leads (legado)
insert into public.leads (first_name, last_name, phone, email, master_interes, session_date, session_time, origen, status, created_at) values
  ('Irene', 'Alonso Sánchez', '+34 642 758 993', 'irene.alonso@gmail.com', null, current_date - 53, '10:00', 'landing', 'descartado', now() - interval '43 days 2 hours 48 minutes'),
  ('Carlos', 'Álvarez Delgado', '+34 696 289 978', 'Carlos.alvarez@outlook.com', 'Online', current_date - 99, '11:00', 'landing', 'descartado', now() - interval '91 days 9 hours 28 minutes'),
  ('Fernando', 'Ramírez Marín', '+54 403 179 1444', 'FERNANDO.RAMIREZ@ESTUDIO-ARQ.ES', null, current_date - 100, '12:00', 'landing', 'descartado', now() - interval '45 days 6 hours 53 minutes'),
  ('Ana', 'Molina Blanco', '655396154', 'ana.molina@hotmail.com', null, current_date - 108, '13:00', 'landing', 'descartado', now() - interval '49 days 10 hours 29 minutes'),
  ('Rocío', 'Sanz Castro', '+54 391 685 2670', '  rocio.sanz@estudio-arq.es  ', null, current_date - 137, '14:00', 'landing', 'contactado', now() - interval '62 days 12 hours 3 minutes'),
  ('Miguel', 'Muñoz Morales', '+34 606 491 877', 'miguel.munoz@yahoo.es', 'MBIM', current_date - 64, '15:00', 'landing', 'descartado', now() - interval '45 days 11 hours 54 minutes');

-- Usuarios de prueba (SOLO LOCAL). Sin MFA.
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
values ('00000000-0000-0000-0000-000000000000', '11111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated', 'admin@idesie.test', extensions.crypt('Crm-Admin-2026', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');
insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values (gen_random_uuid(), '11111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111', jsonb_build_object('sub', '11111111-1111-4111-8111-111111111111', 'email', 'admin@idesie.test', 'email_verified', true), 'email', now(), now(), now());
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
values ('00000000-0000-0000-0000-000000000000', '22222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated', 'comercial@idesie.test', extensions.crypt('Crm-Comercial-2026', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');
insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values (gen_random_uuid(), '22222222-2222-4222-8222-222222222222', '22222222-2222-4222-8222-222222222222', jsonb_build_object('sub', '22222222-2222-4222-8222-222222222222', 'email', 'comercial@idesie.test', 'email_verified', true), 'email', now(), now(), now());
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
values ('00000000-0000-0000-0000-000000000000', '33333333-3333-4333-8333-333333333333', 'authenticated', 'authenticated', 'lectura@idesie.test', extensions.crypt('Crm-Lectura-2026', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');
insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values (gen_random_uuid(), '33333333-3333-4333-8333-333333333333', '33333333-3333-4333-8333-333333333333', jsonb_build_object('sub', '33333333-3333-4333-8333-333333333333', 'email', 'lectura@idesie.test', 'email_verified', true), 'email', now(), now(), now());
insert into crm.usuarios (id, nombre, email, rol) values
  ('11111111-1111-4111-8111-111111111111', 'Ana Directora', 'admin@idesie.test', 'admin'),
  ('22222222-2222-4222-8222-222222222222', 'Carlos Comercial', 'comercial@idesie.test', 'comercial'),
  ('33333333-3333-4333-8333-333333333333', 'Laura Lectura', 'lectura@idesie.test', 'lectura');

-- Proceso de unificación: crea contactos/entradas/oportunidades. Lo de hace más de 30 días queda 'gestionada'.
select crm.procesar_entradas(now() - interval '30 days');

-- Trabajo del equipo simulado
select set_config('request.jwt.claims', json_build_object('sub', '22222222-2222-4222-8222-222222222222', 'role', 'authenticated')::text, true);
update crm.oportunidades set propietario_id = '22222222-2222-4222-8222-222222222222' where id in (select o.id from crm.oportunidades o join crm.pipelines p on p.id = o.pipeline_id where p.codigo = 'admision' and o.propietario_id is null order by o.creado_at desc limit 9);
update crm.oportunidades o set etapa_id = (select id from crm.etapas e where e.pipeline_id = o.pipeline_id and e.nombre = 'Contactado') where propietario_id = '22222222-2222-4222-8222-222222222222' and etapa_id = (select id from crm.etapas e where e.pipeline_id = o.pipeline_id and e.nombre = 'Solicitud recibida') and id in (select id from crm.oportunidades where propietario_id = '22222222-2222-4222-8222-222222222222' order by creado_at desc limit 3);
update crm.entradas set estado = 'en_gestion', asignado_a = '22222222-2222-4222-8222-222222222222' where id in (select id from crm.entradas where estado = 'nueva' and tipo in ('mensaje_contacto', 'solicitud_admision') order by recibido_at desc limit 5);
select crm.marcar_leida(id, true) from crm.entradas where estado <> 'nueva' or recibido_at < now() - interval '3 days';
insert into crm.notas (contacto_id, autor_id, texto) select contacto_id, '22222222-2222-4222-8222-222222222222', 'Llamado hoy: muy interesado, prefiere modalidad online. Enviar comparativa de másteres.' from crm.entradas where estado = 'en_gestion' order by recibido_at desc limit 3;
select set_config('request.jwt.claims', json_build_object('sub', '11111111-1111-4111-8111-111111111111', 'role', 'authenticated')::text, true);
update crm.oportunidades o set etapa_id = (select id from crm.etapas e where e.pipeline_id = o.pipeline_id and e.nombre = 'Matriculado') where id in (select o2.id from crm.oportunidades o2 join crm.etapas e2 on e2.id = o2.etapa_id where e2.nombre = 'Admitido' order by o2.creado_at limit 2);
insert into crm.notas (contacto_id, autor_id, texto) select id, '11111111-1111-4111-8111-111111111111', 'Contacto prioritario (recomendado por antiguo alumno).' from crm.contactos order by creado_at limit 2;
insert into crm.tareas (contacto_id, asignado_a, titulo, vence_at, creado_por) select id, '22222222-2222-4222-8222-222222222222', 'Llamar para resolver dudas de financiación', now() - interval '2 days', '11111111-1111-4111-8111-111111111111' from crm.contactos order by creado_at desc limit 2;
insert into crm.tareas (contacto_id, asignado_a, titulo, vence_at, creado_por) select id, '22222222-2222-4222-8222-222222222222', 'Enviar propuesta de formación in company', now() + interval '3 days', '11111111-1111-4111-8111-111111111111' from crm.contactos order by creado_at limit 1;
select set_config('request.jwt.claims', '', true);
