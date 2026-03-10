import React from 'react';

export default function PrivacyPage() {
    return (
        <div className="space-y-12">
            <header className="space-y-4">
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white font-outfit">
                    Política de <span className="text-brand-turquoise">Privacidad</span>
                </h1>
                <p className="text-slate-400 text-lg leading-relaxed">
                    Compromiso de transparencia y protección de datos en la era de la Inteligencia Artificial.
                </p>
            </header>

            <div className="prose prose-invert max-w-none space-y-12 text-slate-300 leading-relaxed font-light">
                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-white uppercase tracking-[0.2em] flex items-center gap-3">
                        <span className="text-brand-turquoise">01.</span> Identidad y Responsabilidad
                    </h2>
                    <p>
                        Opps One, con domicilio en Lima, Perú, actúa como titular del banco de datos personales y responsable del tratamiento de la información recopilada a través de nuestra plataforma. De conformidad con la Ley N° 29733 (Ley de Protección de Datos Personales) y su Reglamento, garantizamos la implementación de medidas técnicas, organizativas y legales para asegurar la privacidad y seguridad de sus datos.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-white uppercase tracking-[0.2em] flex items-center gap-3">
                        <span className="text-brand-turquoise">02.</span> Naturaleza de la Información Recopilada
                    </h2>
                    <p>
                        Recopilamos datos de carácter identificativo (nombre, correo electrónico, cargo), datos de navegación y, fundamentalmente, datos operativos suministrados voluntariamente para la configuración de agentes de IA. Esto incluye historiales de chat, documentos corporativos para entrenamiento de modelos y parámetros de flujos de trabajo específicos que permiten la personalización de nuestra tecnología SaaS para su organización.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-white uppercase tracking-[0.2em] flex items-center gap-3">
                        <span className="text-brand-turquoise">03.</span> Finalidad Estratégica del Tratamiento
                    </h2>
                    <p>
                        La información es procesada con el fin primordial de (i) proveer y optimizar los servicios de automatización contratados; (ii) entrenar y perfeccionar los modelos de IA exclusivos para su cuenta; (iii) gestionar el soporte técnico proactivo; y (iv) realizar análisis estadísticos anonimizados para mejorar la eficiencia de nuestros algoritmos de procesamiento de lenguaje natural y visión computacional.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-white uppercase tracking-[0.2em] flex items-center gap-3">
                        <span className="text-brand-turquoise">04.</span> Procesamiento mediante Inteligencia Artificial
                    </h2>
                    <p>
                        Al utilizar nuestros servicios, usted reconoce que los datos operativos pueden ser procesados a través de modelos de terceros (como OpenAI, Anthropic o Google) bajo protocolos de API seguros. Opps One se asegura de que estos proveedores mantengan estándares de privacidad rigurosos, garantizando que su data no sea utilizada para el entrenamiento de modelos públicos externos, manteniendo la exclusividad y confidencialidad corporativa.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-white uppercase tracking-[0.2em] flex items-center gap-3">
                        <span className="text-brand-turquoise">05.</span> Transferencia Internacional de Datos
                    </h2>
                    <p>
                        Debido a la naturaleza de nuestra infraestructura en la nube, los datos personales pueden ser objeto de transferencia internacional hacia servidores ubicados fuera de Perú. Estos procesos se realizan exclusivamente con proveedores que cuentan con certificaciones internacionales de seguridad (ISO 27001, SOC 2) y que garantizan un nivel adecuado de protección conforme a los estándares exigidos por la legislación peruana.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-white uppercase tracking-[0.2em] flex items-center gap-3">
                        <span className="text-brand-turquoise">06.</span> Seguridad y Medidas de Cifrado
                    </h2>
                    <p>
                        Opps One aplica protocolos de cifrado AES-256 en reposo y TLS 1.3 en tránsito. Limitamos el acceso a la información personal a empleados y contratistas que estrictamente requieren conocer dichos datos para desempeñar sus funciones laborales, todos ellos sujetos a estrictas cláusulas de confidencialidad y ética profesional en el manejo de propiedad intelectual e información confidencial.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-white uppercase tracking-[0.2em] flex items-center gap-3">
                        <span className="text-brand-turquoise">07.</span> Derechos del Titular (Derechos ARCO)
                    </h2>
                    <p>
                        Usted podrá ejercer en cualquier momento sus derechos de Acceso, Rectificación, Cancelación y Oposición (ARCO). Para solicitar el retiro de su consentimiento o la eliminación de información sensible de nuestros sistemas de procesamiento por IA, envíe una solicitud formal a <span className="text-brand-turquoise">admin@opps.one</span>. Atenderemos su requerimiento dentro de los plazos legales establecidos por la Autoridad Nacional de Protección de Datos Personales.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-white uppercase tracking-[0.2em] flex items-center gap-3">
                        <span className="text-brand-turquoise">08.</span> Actualizaciones de la Política
                    </h2>
                    <p>
                        Dada la evolución constante de las tecnologías de Inteligencia Artificial y el marco normativo digital, nos reservamos el derecho de actualizar esta política. Cualquier modificación significativa será notificada a través de nuestra plataforma o mediante correo electrónico a los administradores de las cuentas activas, asegurando que siempre tenga conocimiento de cómo protegemos su privacidad en Opps One.
                    </p>
                </section>

                <div className="pt-10 border-t border-white/5">
                    <p className="text-xs text-slate-500 italic">
                        Opps One - Soluciones de Automatización Industrial y Corporativa. Lima, Perú.
                    </p>
                </div>
            </div>
        </div>
    );
}
