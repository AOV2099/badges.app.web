# Guía comprensiva para crear certificados digitales con Open Badges 3.0

> Documento de referencia para diseñar, emitir, verificar y mantener certificados digitales basados en **Open Badges 3.0**.
>
> Última actualización de esta guía: 2026-06-08.

---

## 1. Objetivo de la guía

Esta guía explica cómo crear certificados digitales usando **Open Badges 3.0**, desde la definición conceptual hasta una ruta práctica de implementación.

La idea es que puedas usar este documento como referencia para construir un sistema propio o para evaluar una plataforma existente que emita credenciales digitales verificables.

Open Badges 3.0 sirve para emitir certificados, insignias, constancias, microcredenciales o reconocimientos digitales que pueden ser compartidos por el usuario y verificados por terceros.

---

## 2. Qué es Open Badges 3.0

**Open Badges 3.0** es un estándar de 1EdTech para representar logros digitales verificables. Un badge puede representar, por ejemplo:

- Un curso completado.
- Una certificación técnica.
- Una habilidad demostrada.
- Una competencia laboral.
- Una participación en un evento.
- Un logro académico.
- Una acreditación profesional.

A diferencia de un certificado PDF tradicional, un Open Badge contiene metadatos estructurados y verificables. Es decir, no solo “se ve bonito”, sino que incluye información legible por máquinas sobre quién lo emitió, quién lo recibió, qué logro representa, cuándo fue emitido, bajo qué criterios se otorgó y cómo puede verificarse su autenticidad.

En Open Badges 3.0, una credencial se alinea con el modelo de **W3C Verifiable Credentials 2.0**, por lo que una insignia puede funcionar como una credencial digital firmada criptográficamente.

---

## 3. Por qué usar Open Badges 3.0

Open Badges 3.0 es útil cuando necesitas que un certificado digital sea:

### 3.1 Verificable

Un tercero puede comprobar que la credencial fue emitida por una organización legítima y que no fue alterada.

### 3.2 Portable

El usuario puede mover su credencial entre plataformas, wallets, perfiles profesionales o sistemas compatibles.

### 3.3 Interoperable

Al usar un estándar abierto, otras plataformas pueden leer e interpretar la credencial sin depender de un proveedor específico.

### 3.4 Rica en metadatos

El badge no solo dice “aprobado”, sino que puede incluir criterios, evidencia, habilidades, fechas, issuer, recipient, alineaciones con competencias y más.

### 3.5 Más segura que un PDF aislado

Un PDF o imagen puede ser editado fácilmente. En Open Badges 3.0, la verificación se apoya en firmas, pruebas criptográficas y datos estructurados.

---

## 4. Conceptos principales

### 4.1 Badge

Es la representación visual y digital de un logro. Puede incluir una imagen, pero en Open Badges 3.0 lo más importante es la credencial estructurada y verificable, no solo la imagen.

### 4.2 Achievement

Es el logro que se reconoce. Describe qué ganó o completó la persona.

Ejemplos:

- “Certificación en JavaScript Básico”.
- “Curso de Seguridad Industrial completado”.
- “Competencia demostrada en atención al cliente”.

Un `Achievement` suele incluir:

- Nombre del logro.
- Descripción.
- Criterios para obtenerlo.
- Imagen asociada.
- Tipo de logro.
- Nivel, área, etiquetas o competencias relacionadas.

### 4.3 OpenBadgeCredential

Es la credencial emitida a una persona específica. En Open Badges 3.0, la credencial funciona como una **Verifiable Credential**.

Incluye información como:

- Issuer: quién emite.
- Credential subject: quién recibe.
- Achievement: qué logro se reconoce.
- Fecha de emisión.
- Fecha de expiración, si aplica.
- Evidencias.
- Prueba criptográfica o firma.

### 4.4 Issuer

Es la organización, institución, empresa o sistema que emite la credencial.

Ejemplos:

- Universidad.
- Empresa.
- Plataforma de cursos.
- Área interna de capacitación.
- Comunidad técnica.

El issuer debe tener identidad verificable. En implementaciones modernas puede representarse mediante HTTPS, DID o `did:web`.

### 4.5 Holder o recipient

Es la persona que recibe la credencial.

Puede ser un estudiante, empleado, candidato, instructor, usuario o participante.

En el modelo de Verifiable Credentials, esta persona suele representarse como el `credentialSubject`.

### 4.6 Verifier

Es quien revisa la credencial.

Ejemplos:

- Reclutador.
- Plataforma de empleo.
- Empresa.
- Universidad.
- Sistema interno de validación.

El verifier comprueba que la credencial no haya sido alterada y que provenga del issuer correcto.

### 4.7 Verifiable Credential

Es un formato estándar del W3C para representar declaraciones verificables digitalmente.

En términos simples: es un documento JSON con datos sobre una afirmación, firmado o protegido de forma que pueda comprobarse su autenticidad.

### 4.8 Verifiable Presentation

Es una presentación de una o varias credenciales que un usuario comparte con un tercero.

Por ejemplo, una persona podría compartir tres badges para demostrar que tiene conocimientos en frontend, backend y bases de datos.

### 4.9 CLR: Comprehensive Learner Record

Un **Comprehensive Learner Record** permite agrupar varios logros o badges en un historial más completo del aprendizaje o trayectoria de una persona.

Open Badges 3.0 funciona bien para un logro individual. CLR 2.0 sirve cuando quieres agrupar muchos logros en un expediente integral.

---

## 5. Diferencia entre certificado tradicional y Open Badge 3.0

| Aspecto | Certificado PDF tradicional | Open Badge 3.0 |
|---|---|---|
| Verificación | Manual o por folio | Criptográfica y estructurada |
| Portabilidad | Limitada | Alta |
| Lectura por sistemas | Baja | Alta |
| Metadatos | Escasos o no estructurados | Ricos y estandarizados |
| Interoperabilidad | Depende del proveedor | Basada en estándar abierto |
| Alteración | Fácil de modificar visualmente | Puede detectarse si fue manipulado |
| Uso en wallets | No necesariamente | Diseñado para ecosistemas de credenciales |

---

## 6. Arquitectura general de un sistema de certificados con Open Badges 3.0

Un sistema básico suele tener estos componentes:

```text
[Administrador / LMS / Sistema interno]
              |
              v
[Servicio emisor de badges]
              |
              v
[Generación de OpenBadgeCredential]
              |
              v
[Firma / prueba criptográfica]
              |
              v
[Entrega al usuario]
              |
              v
[Wallet / descarga / perfil / email]
              |
              v
[Verificación por terceros]
```

### Componentes recomendados

1. **Panel administrativo**  
   Para crear achievements, administrar plantillas, emitir credenciales y consultar historial.

2. **Base de datos**  
   Para guardar usuarios, achievements, emisiones, estados, revocaciones y auditoría.

3. **Servicio de emisión**  
   Genera el JSON de OpenBadgeCredential y lo firma.

4. **Servicio de identidad del issuer**  
   Expone la información pública necesaria para que otros puedan verificar al emisor.

5. **Servicio de verificación**  
   Permite validar credenciales emitidas.

6. **Sistema de entrega**  
   Puede ser descarga directa, email, wallet, API, portal de usuario o integración con otra plataforma.

7. **Servicio de revocación o estado**  
   Permite invalidar una credencial si fue emitida por error, si expiró o si se revocó.

---

## 7. Flujo recomendado de implementación

## Paso 1: Definir el caso de uso

Antes de tocar código, define exactamente qué vas a certificar.

Preguntas clave:

- ¿Qué logro se va a reconocer?
- ¿Es un curso, habilidad, competencia, certificación, participación o evaluación?
- ¿Quién puede recibirlo?
- ¿Quién lo emite?
- ¿La credencial expira?
- ¿Requiere evidencia?
- ¿Debe poder revocarse?
- ¿Se compartirá públicamente?
- ¿Se integrará con una wallet?

Ejemplo:

```text
Caso de uso:
Emitir certificados digitales para personas que completen el curso interno de “Fundamentos de Automatización QA”.

Issuer:
Área de capacitación de la empresa.

Recipient:
Empleado que aprueba el curso.

Criterio:
Completar módulos y obtener al menos 80% en la evaluación final.

Expiración:
No expira.

Evidencia:
Resultado de evaluación y fecha de finalización.
```

Utilidad de este paso: evita emitir badges genéricos sin valor real. Un badge debe representar algo verificable y significativo.

---

## Paso 2: Diseñar el modelo del logro, Achievement

El `Achievement` describe el certificado o badge como concepto general.

Debe responder:

- Qué se logró.
- Qué significa.
- Cómo se obtiene.
- Qué habilidades representa.
- Qué evidencia o criterios lo respaldan.

Ejemplo conceptual:

```json
{
  "type": ["Achievement"],
  "id": "https://example.com/achievements/qa-automation-basics",
  "name": "Fundamentos de Automatización QA",
  "description": "Reconoce que la persona completó una formación básica sobre automatización de pruebas.",
  "criteria": {
    "narrative": "Completar todos los módulos y aprobar la evaluación final con mínimo 80%."
  },
  "achievementType": "Certificate",
  "tag": ["QA", "Automation", "Testing"]
}
```

Recomendaciones:

- Usa nombres claros y profesionales.
- Evita títulos inflados o ambiguos.
- Define criterios medibles.
- Incluye habilidades relacionadas si tu sistema las maneja.
- Mantén identificadores persistentes.

Utilidad de este paso: el Achievement es la base de todas las credenciales que emitas de ese tipo.

---

## Paso 3: Definir la identidad del issuer

El issuer es quien respalda la credencial. Si el issuer no es confiable, el certificado pierde valor.

Información mínima recomendable:

- Nombre de la organización.
- URL oficial.
- Descripción.
- Email de contacto.
- Imagen o logo.
- Identificador estable.
- Llave pública o mecanismo de verificación.

Ejemplo conceptual:

```json
{
  "type": ["Profile"],
  "id": "did:web:example.com",
  "name": "Example Academy",
  "url": "https://example.com",
  "email": "certificates@example.com",
  "description": "Organización emisora de credenciales digitales de aprendizaje."
}
```

### Sobre `did:web`

`did:web` es una forma de representar una identidad descentralizada usando un dominio web.

Ejemplo:

```text
did:web:example.com
```

Normalmente requiere publicar un DID Document en una ruta específica del dominio. Ese documento contiene información pública, como llaves de verificación.

Utilidad de este paso: permite que terceros sepan quién emitió la credencial y cómo verificar su firma.

---

## Paso 4: Definir la identidad del recipient

El recipient es la persona que recibe la credencial.

En Open Badges 3.0 se representa dentro de `credentialSubject`.

Puedes identificar al usuario mediante:

- DID.
- URL de perfil.
- Identificador interno.
- Email hasheado o protegido.
- Otro identificador verificable.

Recomendación importante: evita exponer datos personales innecesarios. No pongas CURP, teléfono, dirección, RFC u otros datos sensibles salvo que sea estrictamente necesario y tengas base legal/consentimiento.

Ejemplo conceptual:

```json
{
  "type": ["AchievementSubject"],
  "id": "did:key:z6Mk...",
  "achievement": "https://example.com/achievements/qa-automation-basics"
}
```

Utilidad de este paso: vincula el logro con la persona correcta sin comprometer más datos de los necesarios.

---

## Paso 5: Crear la estructura de OpenBadgeCredential

La credencial une al issuer, recipient y achievement en un documento verificable.

Ejemplo simplificado:

```json
{
  "@context": [
    "https://www.w3.org/ns/credentials/v2",
    "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json"
  ],
  "type": ["VerifiableCredential", "OpenBadgeCredential"],
  "id": "urn:uuid:123e4567-e89b-12d3-a456-426614174000",
  "name": "Certificado en Fundamentos de Automatización QA",
  "issuer": {
    "id": "did:web:example.com",
    "type": ["Profile"],
    "name": "Example Academy"
  },
  "validFrom": "2026-06-08T12:00:00Z",
  "credentialSubject": {
    "type": ["AchievementSubject"],
    "id": "did:key:z6MkRecipientExample",
    "achievement": {
      "id": "https://example.com/achievements/qa-automation-basics",
      "type": ["Achievement"],
      "name": "Fundamentos de Automatización QA",
      "description": "Reconoce la finalización y aprobación de la formación básica en automatización de pruebas.",
      "criteria": {
        "narrative": "Completar todos los módulos y aprobar la evaluación final con mínimo 80%."
      }
    }
  }
}
```

Notas:

- Este ejemplo es ilustrativo. Para producción debes validarlo contra el schema oficial.
- El `id` de la credencial debe ser único.
- `validFrom` indica desde cuándo es válida.
- Puede agregarse `validUntil` si la credencial expira.
- El `credentialSubject` representa al receptor.
- El `achievement` describe el logro.

Utilidad de este paso: genera el documento central que será firmado, entregado y verificado.

---

## Paso 6: Firmar la credencial

La firma es lo que permite comprobar que la credencial no fue alterada y que proviene del issuer correcto.

Open Badges 3.0 se apoya en los mecanismos de Verifiable Credentials. Dependiendo de tu implementación, puedes encontrar opciones como:

- JSON-LD proofs.
- VC-JWT.
- DIDs con llaves públicas.
- Otros mecanismos compatibles con el ecosistema VC.

Ejemplo conceptual de una credencial con prueba:

```json
{
  "@context": [
    "https://www.w3.org/ns/credentials/v2",
    "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json"
  ],
  "type": ["VerifiableCredential", "OpenBadgeCredential"],
  "id": "urn:uuid:123e4567-e89b-12d3-a456-426614174000",
  "issuer": {
    "id": "did:web:example.com",
    "type": ["Profile"],
    "name": "Example Academy"
  },
  "validFrom": "2026-06-08T12:00:00Z",
  "credentialSubject": {
    "type": ["AchievementSubject"],
    "id": "did:key:z6MkRecipientExample"
  },
  "proof": {
    "type": "DataIntegrityProof",
    "created": "2026-06-08T12:00:00Z",
    "verificationMethod": "did:web:example.com#key-1",
    "proofPurpose": "assertionMethod",
    "proofValue": "zExampleProofValue..."
  }
}
```

Recomendaciones de seguridad:

- Protege la llave privada del issuer.
- No firmes desde el frontend.
- Usa rotación de llaves si tu operación lo requiere.
- Mantén auditoría de cada emisión.
- Registra quién solicitó o aprobó la emisión.
- Valida datos antes de firmar.

Utilidad de este paso: convierte el badge en una credencial verificable y resistente a manipulación.

---

## Paso 7: Validar la credencial contra el estándar

Antes de entregar una credencial, valida que cumpla con:

- JSON válido.
- JSON-LD context correcto.
- Schema oficial de Open Badges 3.0.
- Campos requeridos.
- Firma válida.
- Identificadores resolubles.
- Fechas correctas.
- Estado de revocación, si aplica.

Herramientas útiles:

- Validador oficial o público compatible con Open Badges 3.0.
- JSON Schema validator.
- Tests automatizados propios.
- Conformance Test Suite de 1EdTech si buscas certificación formal.

Utilidad de este paso: evita emitir credenciales que después no puedan verificarse o que sean rechazadas por wallets/plataformas.

---

## Paso 8: Diseñar la apariencia visual del certificado

Aunque Open Badges 3.0 se centra en datos verificables, la presentación visual sigue siendo importante.

Puedes tener:

- Imagen del badge.
- Certificado PDF complementario.
- Página pública de verificación.
- Tarjeta visual en el perfil del usuario.
- Vista para compartir en redes.

Elementos visuales recomendados:

- Logo del issuer.
- Nombre del logro.
- Nombre del recipient, si el usuario decide mostrarlo.
- Fecha de emisión.
- Código o identificador de verificación.
- QR hacia página de validación.
- Nivel o categoría.

Importante: la imagen o PDF no debe ser la única fuente de verdad. La fuente de verdad debe ser la credencial verificable.

Utilidad de este paso: mejora la experiencia del usuario sin sacrificar verificabilidad.

---

## Paso 9: Entregar la credencial al usuario

Formas comunes de entrega:

### 9.1 Descarga directa

El usuario descarga un archivo JSON, JWT o paquete compatible.

### 9.2 Email

Se envía un correo con:

- Link de visualización.
- Link de descarga.
- Link de verificación.
- Instrucciones para compartir.

### 9.3 Portal de usuario

El usuario inicia sesión y ve sus credenciales.

### 9.4 Wallet de credenciales

El usuario guarda la credencial en una wallet compatible.

### 9.5 API

Otra plataforma consume la credencial mediante endpoints.

Recomendación: entrega siempre una forma humana de verla y una forma técnica de descargarla o verificarla.

Utilidad de este paso: permite que el usuario realmente aproveche la credencial.

---

## Paso 10: Crear una página pública de verificación

Una página de verificación permite que un tercero pegue, escanee o consulte una credencial.

Debe mostrar:

- Estado: válida, inválida, expirada o revocada.
- Issuer.
- Recipient, si es visible.
- Achievement.
- Fecha de emisión.
- Evidencia o criterios.
- Firma verificada.
- Estado de revocación.

Ejemplo de flujo:

```text
Usuario comparte badge -> Verifier abre URL o escanea QR -> Sistema carga credencial -> Valida firma -> Valida issuer -> Valida expiración/revocación -> Muestra resultado
```

Utilidad de este paso: facilita la confianza para reclutadores, empresas o terceros no técnicos.

---

## Paso 11: Manejar expiración y revocación

No todas las credenciales deben vivir para siempre.

Casos donde conviene expiración:

- Certificaciones de seguridad.
- Certificaciones legales.
- Licencias profesionales.
- Conocimientos que se vuelven obsoletos.
- Cumplimientos internos periódicos.

Casos donde conviene revocación:

- Emisión por error.
- Fraude.
- Usuario incorrecto.
- Cambio de reglas.
- Incumplimiento posterior.

Modelo básico de estado:

```text
issued -> active
issued -> revoked
issued -> expired
issued -> superseded
```

Recomendaciones:

- No borres emisiones históricas; márcalas con estado.
- Guarda razón de revocación.
- Guarda usuario/admin que revocó.
- Guarda timestamp.
- Considera si la razón debe ser pública o privada.

Utilidad de este paso: mantiene confianza y control sobre las credenciales emitidas.

---

## Paso 12: Guardar auditoría y trazabilidad

Toda emisión debe dejar rastro.

Tabla o colección recomendada para emisiones:

```text
credentials
- id
- credential_uuid
- achievement_id
- recipient_id
- issuer_id
- status
- issued_at
- valid_from
- valid_until
- revoked_at
- revoked_reason
- signed_payload_hash
- created_by
- approved_by
- delivery_status
```

También conviene guardar eventos:

```text
credential_events
- id
- credential_id
- event_type
- actor_id
- timestamp
- metadata
```

Eventos posibles:

- created
- signed
- delivered
- downloaded
- verified
- revoked
- expired
- resent

Utilidad de este paso: te protege en auditorías, soporte y análisis de errores.

---

## Paso 13: Integrar con sistemas existentes

Puedes integrar Open Badges 3.0 con:

- LMS.
- Plataforma interna de cursos.
- Sistema RH.
- SSO.
- Google Workspace o Microsoft Entra ID.
- CRM.
- Portal de empleados.
- Plataforma de reclutamiento.
- Repositorio de evidencias.

Ejemplo de integración con un LMS:

```text
LMS detecta curso aprobado
        |
        v
Envía evento al backend de badges
        |
        v
Backend valida criterios
        |
        v
Genera OpenBadgeCredential
        |
        v
Firma credencial
        |
        v
Notifica al usuario
```

Utilidad de este paso: automatiza la emisión y evita trabajo manual.

---

## Paso 14: Definir estrategia de privacidad

Open Badges 3.0 puede incluir datos personales, por lo que debes pensar en privacidad desde el diseño.

Buenas prácticas:

- Usa datos mínimos.
- No publiques datos sensibles innecesarios.
- Permite que el usuario controle qué comparte.
- Define si las páginas de verificación son públicas o privadas.
- Evita incluir emails en claro si no es necesario.
- Considera usar identificadores descentralizados o hashes.
- Documenta retención de datos.
- Pide consentimiento cuando aplique.

Preguntas clave:

- ¿La credencial será pública por defecto?
- ¿El recipient puede ocultarla?
- ¿Qué pasa si solicita eliminación de datos?
- ¿La verificación requiere autenticación?
- ¿Qué datos verá un reclutador?

Utilidad de este paso: evita problemas legales y protege al usuario.

---

## Paso 15: Probar la compatibilidad

Prueba tus credenciales en distintos escenarios:

- Validación directa del JSON.
- Verificación de firma.
- Visualización en tu portal.
- Descarga y carga en validador externo.
- Integración con wallet, si aplica.
- Validación de credencial expirada.
- Validación de credencial revocada.
- Badge con evidencia.
- Badge sin expiración.
- Badge con múltiples tags o skills.

Checklist de pruebas:

```text
[ ] La credencial es JSON válido.
[ ] Tiene contexts correctos.
[ ] Tiene type correcto.
[ ] Tiene issuer válido.
[ ] Tiene credentialSubject válido.
[ ] Tiene achievement válido.
[ ] Tiene validFrom correcto.
[ ] Tiene id único.
[ ] La firma se verifica correctamente.
[ ] La credencial alterada falla la verificación.
[ ] La credencial revocada aparece como revocada.
[ ] La credencial expirada aparece como expirada.
[ ] La página pública muestra información clara.
[ ] El usuario puede descargar o compartir la credencial.
```

Utilidad de este paso: asegura interoperabilidad y reduce fallos en producción.

---

## Paso 16: Considerar certificación formal de 1EdTech

Si tu producto necesita reconocimiento formal de compatibilidad, puedes revisar la certificación de 1EdTech.

Roles comunes en el ecosistema:

### Issuer

Sistema que crea y entrega OpenBadgeCredentials a recipients.

### Host

Sistema que almacena badges en nombre de usuarios y expone APIs para acceder a ellos.

### Displayer

Sistema que muestra badges y consume credenciales desde hosts.

Si solo vas a emitir credenciales internas, quizá no necesitas certificación formal al inicio. Si vas a vender una plataforma o interoperar con instituciones, conviene considerarla.

Utilidad de este paso: aumenta confianza comercial e interoperabilidad formal.

---

## 8. Modelo mínimo de base de datos

Una estructura inicial podría ser:

```sql
CREATE TABLE issuers (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  did TEXT NOT NULL,
  url TEXT,
  email TEXT,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE achievements (
  id UUID PRIMARY KEY,
  issuer_id UUID REFERENCES issuers(id),
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  criteria TEXT NOT NULL,
  achievement_type TEXT,
  image_url TEXT,
  tags JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE recipients (
  id UUID PRIMARY KEY,
  external_id TEXT,
  name TEXT,
  email_hash TEXT,
  did TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE credentials (
  id UUID PRIMARY KEY,
  achievement_id UUID REFERENCES achievements(id),
  recipient_id UUID REFERENCES recipients(id),
  issuer_id UUID REFERENCES issuers(id),
  credential_identifier TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active',
  valid_from TIMESTAMP NOT NULL,
  valid_until TIMESTAMP,
  signed_payload JSONB NOT NULL,
  signed_payload_hash TEXT,
  revoked_at TIMESTAMP,
  revoked_reason TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

Notas:

- Puedes usar PostgreSQL con JSONB para almacenar el payload firmado.
- No dependas solo del JSONB; guarda campos consultables como `status`, `issuer_id`, `recipient_id` y `achievement_id`.
- Guarda hashes para detectar cambios.

---

## 9. API sugerida

### Crear Achievement

```http
POST /api/achievements
```

Body:

```json
{
  "name": "Fundamentos de Automatización QA",
  "description": "Reconoce conocimientos básicos en automatización de pruebas.",
  "criteria": "Aprobar evaluación final con mínimo 80%.",
  "achievementType": "Certificate",
  "tags": ["QA", "Automation", "Testing"]
}
```

### Emitir credencial

```http
POST /api/credentials/issue
```

Body:

```json
{
  "achievementId": "uuid-achievement",
  "recipient": {
    "externalId": "employee-123",
    "name": "Nombre del usuario",
    "email": "user@example.com"
  },
  "evidence": {
    "score": 92,
    "completedAt": "2026-06-08T12:00:00Z"
  }
}
```

### Obtener credencial

```http
GET /api/credentials/:id
```

### Verificar credencial

```http
POST /api/credentials/verify
```

Body:

```json
{
  "credential": { }
}
```

### Revocar credencial

```http
POST /api/credentials/:id/revoke
```

Body:

```json
{
  "reason": "Emitida por error"
}
```

---

## 10. Validaciones importantes en backend

Antes de emitir:

```text
[ ] Achievement existe y está activo.
[ ] Issuer está configurado correctamente.
[ ] Recipient existe o puede crearse.
[ ] Criterios de emisión se cumplieron.
[ ] No existe duplicado, si no se permiten duplicados.
[ ] Fechas son válidas.
[ ] Evidence no contiene datos sensibles innecesarios.
[ ] El payload cumple schema.
[ ] La firma se genera correctamente.
```

Antes de verificar:

```text
[ ] JSON recibido es válido.
[ ] Contexts son reconocidos.
[ ] Type incluye OpenBadgeCredential.
[ ] Issuer puede resolverse.
[ ] Llave pública puede resolverse.
[ ] Firma es válida.
[ ] Payload no fue alterado.
[ ] Credential no está expirada.
[ ] Credential no está revocada.
```

---

## 11. Ejemplo de flujo técnico con Node.js

Este es un flujo conceptual, no una librería específica:

```text
1. Recibir solicitud de emisión.
2. Validar usuario autenticado.
3. Validar permisos para emitir.
4. Buscar Achievement.
5. Buscar o crear Recipient.
6. Construir OpenBadgeCredential.
7. Validar schema.
8. Firmar credencial con llave privada del issuer.
9. Guardar payload firmado.
10. Generar URL de verificación.
11. Notificar al usuario.
12. Registrar evento de auditoría.
```

Pseudocódigo:

```js
async function issueCredential({ achievementId, recipientData, evidence }) {
  const achievement = await achievementService.findActiveById(achievementId);
  if (!achievement) throw new Error('Achievement not found');

  const recipient = await recipientService.findOrCreate(recipientData);
  const issuer = await issuerService.getDefaultIssuer();

  const credential = openBadgeBuilder.build({
    issuer,
    recipient,
    achievement,
    evidence,
    validFrom: new Date().toISOString()
  });

  await openBadgeValidator.validateSchema(credential);

  const signedCredential = await credentialSigner.sign({
    credential,
    issuerKeyId: issuer.keyId
  });

  const saved = await credentialRepository.save({
    achievementId,
    recipientId: recipient.id,
    issuerId: issuer.id,
    signedPayload: signedCredential,
    status: 'active'
  });

  await auditLog.record({
    credentialId: saved.id,
    eventType: 'credential_issued'
  });

  await notificationService.sendCredentialIssuedEmail({
    recipient,
    credentialId: saved.id
  });

  return saved;
}
```

---

## 12. Buenas prácticas de diseño

### 12.1 No emitas badges sin criterios claros

Un badge sin criterios pierde valor. Siempre define qué tuvo que hacer la persona para obtenerlo.

### 12.2 Usa nombres consistentes

Evita tener certificados como:

```text
Curso JS
JavaScript básico
JS Básico Certificado
Certificación Javascript Nivel 1
```

Mejor define una taxonomía clara:

```text
JavaScript Fundamentals - Level 1
JavaScript DOM Manipulation - Level 2
JavaScript Testing - Level 3
```

### 12.3 Mantén IDs estables

No cambies IDs públicos sin necesidad. Las credenciales dependen de identificadores resolubles.

### 12.4 Separa plantilla visual de credencial verificable

La plantilla puede cambiar; la credencial emitida no debería alterarse una vez firmada.

### 12.5 Versiona achievements

Si cambian los criterios de un curso, considera crear una nueva versión.

Ejemplo:

```text
qa-automation-basics-v1
qa-automation-basics-v2
```

### 12.6 Guarda el payload firmado original

No reconstruyas una credencial firmada desde cero para verificarla históricamente. Guarda lo que realmente emitiste.

### 12.7 Implementa revocación desde el inicio

Aunque no la uses al principio, diseñarla después puede ser doloroso.

---

## 13. Errores comunes

### Error 1: Tratarlo como solo una imagen

Un Open Badge no es solo un PNG bonito. La parte importante es la credencial verificable.

### Error 2: No validar contra schema

Puede verse correcto, pero fallar en plataformas externas.

### Error 3: Poner datos personales de más

No necesitas exponer todo sobre el usuario.

### Error 4: Firmar desde el frontend

La llave privada nunca debe vivir en el navegador.

### Error 5: No planear revocación

Si emites algo mal, necesitas una forma formal de invalidarlo.

### Error 6: Usar criterios vagos

“Participó satisfactoriamente” no dice mucho. Mejor explica condiciones medibles.

### Error 7: No pensar en migración

Si ya tienes certificados anteriores, define cómo convivirán con Open Badges 3.0.

---

## 14. Roadmap de implementación sugerido

### Fase 1: Diseño funcional

```text
[ ] Definir tipos de certificados.
[ ] Definir issuer.
[ ] Definir recipients.
[ ] Definir criterios.
[ ] Definir evidencia.
[ ] Definir expiración/revocación.
```

### Fase 2: Modelo de datos

```text
[ ] Crear tablas de issuers.
[ ] Crear tablas de achievements.
[ ] Crear tablas de recipients.
[ ] Crear tablas de credentials.
[ ] Crear tablas de audit log.
```

### Fase 3: Generación de credenciales

```text
[ ] Construir OpenBadgeCredential.
[ ] Validar JSON.
[ ] Validar schema.
[ ] Firmar credencial.
[ ] Guardar payload firmado.
```

### Fase 4: Entrega y visualización

```text
[ ] Crear vista del certificado.
[ ] Crear descarga JSON/JWT.
[ ] Crear página pública de verificación.
[ ] Agregar QR.
[ ] Enviar email de emisión.
```

### Fase 5: Verificación

```text
[ ] Validar firma.
[ ] Validar issuer.
[ ] Validar expiración.
[ ] Validar revocación.
[ ] Mostrar resultado legible.
```

### Fase 6: Administración

```text
[ ] Panel para crear achievements.
[ ] Panel para emitir certificados.
[ ] Panel para revocar.
[ ] Panel para consultar historial.
[ ] Exportación de reportes.
```

### Fase 7: Interoperabilidad

```text
[ ] Probar con validador externo.
[ ] Probar con wallet, si aplica.
[ ] Revisar certificación 1EdTech.
[ ] Documentar API pública.
```

---

## 15. Checklist final antes de producción

```text
[ ] Tenemos issuer definido y verificable.
[ ] Tenemos achievements con criterios claros.
[ ] Tenemos recipients modelados con privacidad.
[ ] Generamos OpenBadgeCredential válido.
[ ] Firmamos credenciales de forma segura.
[ ] Protegemos llaves privadas.
[ ] Guardamos auditoría.
[ ] Tenemos revocación.
[ ] Tenemos expiración, si aplica.
[ ] Tenemos página de verificación.
[ ] Tenemos descarga o entrega al usuario.
[ ] Validamos contra herramientas externas.
[ ] Documentamos el proceso interno.
[ ] Tenemos política de privacidad.
[ ] Tenemos plan de soporte para errores de emisión.
```

---

## 16. Glosario rápido

| Término | Significado |
|---|---|
| Open Badge | Credencial digital verificable que representa un logro. |
| Open Badges 3.0 | Versión del estándar alineada con W3C Verifiable Credentials. |
| Achievement | Logro o certificado definido por el issuer. |
| OpenBadgeCredential | Credencial emitida a una persona específica. |
| Issuer | Organización que emite la credencial. |
| Recipient | Persona que recibe la credencial. |
| Holder | Persona o wallet que posee la credencial. |
| Verifier | Persona o sistema que verifica la credencial. |
| Verifiable Credential | Documento digital verificable definido por W3C. |
| Verifiable Presentation | Conjunto de credenciales presentado por un holder. |
| DID | Identificador descentralizado. |
| did:web | DID basado en un dominio web. |
| Proof | Prueba criptográfica o firma de la credencial. |
| Revocation | Invalidación de una credencial. |
| CLR | Registro integral que puede agrupar múltiples credenciales. |

---

## 17. Recomendación práctica para un MVP

Para una primera versión funcional, implementa esto:

```text
1. Panel simple para crear achievements.
2. Endpoint para emitir credenciales.
3. Firma de credenciales en backend.
4. Almacenamiento del payload firmado.
5. Página pública de visualización/verificación.
6. Descarga del JSON firmado.
7. Estado active/revoked.
8. Auditoría básica.
```

No empieces intentando soportar todos los casos posibles. Primero logra que una credencial simple pueda emitirse, firmarse, descargarse y verificarse correctamente.

---

## 18. Fuentes de referencia

- 1EdTech Open Badges 3.0 Specification: https://www.imsglobal.org/spec/ob/v3p0
- 1EdTech Open Badges 3.0 Implementation Guide: https://www.imsglobal.org/spec/ob/v3p0/impl
- 1EdTech Open Badges 3.0 Certification Guide: https://www.imsglobal.org/spec/ob/v3p0/cert
- 1EdTech Digital Credentials Public Validator: https://github.com/1EdTech/digital-credentials-public-validator
- W3C Verifiable Credentials Overview: https://www.w3.org/TR/vc-overview/
- 1EdTech Comprehensive Learner Record 2.0: https://www.imsglobal.org/spec/clr/v2p0

---

## 19. Resumen ejecutivo

Open Badges 3.0 permite crear certificados digitales mucho más potentes que un PDF tradicional. Su valor está en que combina una representación visual con metadatos estructurados, identidad del emisor, criterios de logro, información del receptor y verificación criptográfica.

Para implementarlo correctamente, no basta con diseñar un certificado bonito. Debes definir achievements claros, identidad del issuer, privacidad del recipient, firma segura, validación, revocación, auditoría y una forma sencilla para que terceros verifiquen la credencial.

La ruta más segura es iniciar con un MVP pequeño: emitir una credencial simple, validarla contra el estándar, firmarla correctamente y crear una página de verificación. Después puedes agregar wallets, CLR, certificación formal, integraciones con LMS y APIs más avanzadas.
