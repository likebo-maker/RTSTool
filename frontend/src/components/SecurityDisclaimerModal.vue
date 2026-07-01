<template>
  <Teleport to="body">
    <Transition name="disclaimer-fade">
      <div
        v-if="visible"
        class="disclaimer-backdrop"
        role="presentation"
        @click.self="handleCancel"
      >
        <section
          class="disclaimer-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="security-disclaimer-title"
        >
          <header class="disclaimer-header">
            <div class="disclaimer-mark">
              <ShieldCheck :size="24" />
            </div>
            <div>
              <p class="section-kicker">Information Security Notice</p>
              <h2 id="security-disclaimer-title">{{ brandConfig.appNameCn }}信息安全声明</h2>
            </div>
          </header>

          <div class="disclaimer-content">
            <section>
              <h3>一、工具性质说明</h3>
              <p>{{ brandConfig.appNameCn }}为技术支持业务辅助平台，仅用于提升数据处理、统计分析和报表整理效率，不作为业务决策、质量判定或管理考核的唯一依据。</p>
              <p>工具输出结果仅供参考，最终业务判断应以原始数据、公司制度及相关管理要求为准。</p>
            </section>

            <section>
              <h3>二、本地运行说明</h3>
              <p>本工具采用本地部署方式运行：</p>
              <ol>
                <li>不依赖互联网服务；</li>
                <li>不向外部服务器上传数据；</li>
                <li>不进行外部网络数据传输；</li>
                <li>不调用公网 AI 模型或第三方云服务；</li>
                <li>所有数据处理均在用户本机完成。</li>
              </ol>
              <p>工具运行过程中产生的临时文件、计算结果及导出文件均保存在本地设备，由使用人员自行管理。</p>
            </section>

            <section>
              <h3>三、数据安全说明</h3>
              <p>本工具设计目标为处理业务统计及运营分析数据。使用过程中请避免导入或处理以下敏感信息：</p>
              <ol>
                <li>患者姓名；</li>
                <li>患者身份证号码；</li>
                <li>患者联系方式；</li>
                <li>患者住址信息；</li>
                <li>银行账户信息；</li>
                <li>身份证件照片；</li>
                <li>生物特征信息；</li>
                <li>其他受法律法规或公司制度保护的个人敏感信息。</li>
              </ol>
              <p>如业务数据中包含上述内容，使用前应按照公司信息安全管理要求完成脱敏处理。</p>
            </section>

            <section>
              <h3>四、用户责任说明</h3>
              <p>工具使用人员应确保：</p>
              <ol>
                <li>数据来源合法合规；</li>
                <li>已获得相应数据使用授权；</li>
                <li>遵守公司信息安全管理制度；</li>
                <li>不将处理结果传播至未经授权的人员或平台；</li>
                <li>不利用本工具处理国家法律法规或公司制度禁止处理的数据。</li>
              </ol>
              <p>因违反公司制度或相关法律法规导致的信息安全风险，由数据使用方承担相应责任。</p>
            </section>

            <section>
              <h3>五、免责说明</h3>
              <p>开发人员仅提供工具功能实现，不参与业务数据管理。</p>
              <p>因以下情况导致的数据泄露、数据错误或业务影响，开发人员不承担责任：</p>
              <ol>
                <li>用户导入错误数据；</li>
                <li>用户未按要求进行数据脱敏；</li>
                <li>用户将结果文件传播至非授权人员；</li>
                <li>用户修改工具程序或运行环境；</li>
                <li>用户违反公司信息安全管理规定使用本工具。</li>
              </ol>
            </section>

            <section>
              <h3>六、使用范围声明</h3>
              <p>本工具仅面向授权内部人员使用，禁止向公司外部传播、转让或提供下载。</p>
            </section>
          </div>

          <footer class="disclaimer-actions">
            <button class="ghost-button disclaimer-button" type="button" @click="handleCancel">
              取消
            </button>
            <button class="primary-button disclaimer-button" type="button" @click="handleAgree">
              <CheckCircle2 :size="17" />
              我已阅读并同意
            </button>
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { CheckCircle2, ShieldCheck } from 'lucide-vue-next';
import { brandConfig } from '../config/brandConfig';

defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  mode: {
    type: String,
    default: 'view',
    validator: (value) => ['login', 'firstLogin', 'view'].includes(value)
  }
});

const emit = defineEmits(['agree', 'cancel']);

function handleAgree() {
  emit('agree');
}

function handleCancel() {
  emit('cancel');
}
</script>
